import { getLogger } from "@std/log/get-logger";
import { Router } from "@oak/oak";
import { ApiClient } from "@twurple/api";
import { EventSubHttpListener } from "@twurple/eventsub-http";
import type { Config } from "../config/config.ts";
import { TwitchAuthManager } from "../auth/twitch.ts";
import { EventSubHandler } from "./handler.ts";
import type { WebSocketServer } from "../websocket/server.ts";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

export async function setupEventSub(
  config: Config,
  router: Router,
  wss: WebSocketServer
): Promise<void> {
  if (!config.enableEventSub) {
    logger.info("EventSub is disabled, skipping initialization");
    return;
  }
  
  try {
    const auth = new TwitchAuthManager(config);
    const authProvider = auth.getAppTokenProvider();
    const apiClient = new ApiClient({ authProvider });
    
    const listener = new EventSubHttpListener({
      apiClient,
      secret: config.eventSubSecret,
      strictHostCheck: false, // For development with ngrok
      hostname: new URL(config.publicUrl).hostname,
      pathPrefix: '/webhooks/eventsub'
    });
    
    const handler = new EventSubHandler(config, wss, apiClient);
    await listener.start();
    
    logger.info("EventSub HTTP listener started");
    
    if (config.publicUrl) {
      await setupChannelPointSubscription(config, listener, apiClient);
    } else {
      logger.warn("No public URL configured, EventSub subscriptions will not work");
    }
    
    router.all("/webhooks/eventsub(.*)", async (ctx) => {
      const body = await ctx.request.body().value;
      const headers = Object.fromEntries(ctx.request.headers.entries());
      await handler.handleEventSub(ctx);
    });
    
  } catch (error) {
    logError(logger, 'Failed to set up EventSub', error);
  }
}

async function setupChannelPointSubscription(
  config: Config,
  listener: EventSubHttpListener,
  apiClient: ApiClient
): Promise<void> {
  try {
    const broadcaster = await apiClient.users.getUserById(config.broadcasterId);
    
    if (!broadcaster) {
      throw new Error(`Could not find broadcaster with ID: ${config.broadcasterId}`);
    }
    
    logger.info(`Setting up channel point redemption subscription for ${broadcaster.displayName}`);
    
    const subscription = await listener.subscribeToChannelRedemptionAddEvents(
      broadcaster.id,
      (event) => {
        logger.info(`Channel point redemption: ${event.userName} redeemed ${event.rewardTitle}`);
        
        switch (event.rewardId) {
          case config.rewards.digitalRain:
            logger.info("Triggering digital rain shader effect");
            broadcastRewardEffect(event, "shader", { type: "digitalRain", intensity: 0.8 });
            break;

          case config.rewards.colourShift:
            logger.info("Triggering colour shift effect");
            broadcastRewardEffect(event, "colour", { shift: true, duration: 5000 });
            break;
            
          default:
            logger.info(`Unknown reward ID: ${event.rewardId}`);
        }
      }
    );
    
    logger.info(`Subscribed to channel point redemptions with ID: ${subscription.id}`);
    
  } catch (error) {
    logError(logger, 'Failed to subscribe to channel point redemptions', error);
  }
}

function broadcastRewardEffect(event: any, effectType: string, effectData: Record<string, unknown>): void {
  const message = {
    type: effectType,
    data: {
      ...effectData,
      rewardId: event.rewardId,
      rewardTitle: event.rewardTitle,
      userName: event.userName,
      userInput: event.input || "",
      timestamp: new Date().toISOString()
    }
  };
}
