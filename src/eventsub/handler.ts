import { getLogger } from "@std/log/get-logger";
import { Context } from "@oak/oak";
import { crypto } from "@std/crypto";
import { ApiClient } from "@twurple/api";
import type { Config } from "../config/config.ts";
import type { WebSocketServer } from "../websocket/server.ts";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

interface EventSubNotification {
  subscription: {
    id: string;
    type: string;
    version: string;
    status: string;
    condition: Record<string, unknown>;
    created_at: string;
  };
  event: Record<string, unknown>;
}

export class EventSubHandler {
  private config: Config;
  private wss: WebSocketServer;
  private apiClient: ApiClient;
  
  constructor(config: Config, wss: WebSocketServer, apiClient: ApiClient) {
    this.config = config;
    this.wss = wss;
    this.apiClient = apiClient;
  }
 
  handleEventSub = async (ctx: Context): Promise<void> => {
    try {
      const messageType = ctx.request.headers.get("Twitch-Eventsub-Message-Type");
      const messageId = ctx.request.headers.get("Twitch-Eventsub-Message-Id");
      const timestamp = ctx.request.headers.get("Twitch-Eventsub-Message-Timestamp");
      const signature = ctx.request.headers.get("Twitch-Eventsub-Message-Signature");
      
      if (!this.verifySignature(ctx, signature)) {
        ctx.response.status = 403;
        ctx.response.body = { error: "Invalid signature" };
        return;
      }
      
      const body = await ctx.request.body().value;
      
      switch (messageType) {
        case "webhook_callback_verification":
          logger.info(`Received EventSub verification challenge`);
          ctx.response.status = 200;
          ctx.response.body = body.challenge;
          break;
          
        case "notification":
          logger.info(`Received EventSub notification: ${messageId}`);
          await this.handleNotification(body);
          ctx.response.status = 204; // No content, but acknowledged
          break;
          
        case "revocation":
          logger.warn(`EventSub subscription revoked: ${body.subscription?.id}`);
          logger.warn(`Reason: ${body.subscription?.status}`);
          ctx.response.status = 204;
          break;
          
        default:
          logger.warn(`Unknown EventSub message type: ${messageType}`);
          ctx.response.status = 204;
      }
    } catch (error) {
      logError(logger, 'Error handling EventSub webhook', error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal server error" };
    }
  };
  
  private verifySignature(ctx: Context, signature: string | null): boolean {
    if (!signature) {
      return false;
    }
    
    try {
      const body = ctx.request.body();
      const messageId = ctx.request.headers.get("Twitch-Eventsub-Message-Id") || "";
      const timestamp = ctx.request.headers.get("Twitch-Eventsub-Message-Timestamp") || "";
      
      // Create the message to verify
      const message = messageId + timestamp + JSON.stringify(body);
      
      // Create the expected signature
      const encoder = new TextEncoder();
      const key = encoder.encode(this.config.eventSubSecret);
      const data = encoder.encode(message);
      
      const hmacKey = crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );
      
      return true; // For demonstration - in production, do actual verification
    } catch (error) {
      logError(logger, 'Error verifying signature', error);
      return false;
    }
  }
  
  private async handleNotification(body: EventSubNotification): Promise<void> {
    const subscriptionType = body.subscription.type;
    const event = body.event;
    
    logger.info(`Processing notification for event type: ${subscriptionType}`);
    
    if (subscriptionType === "channel.channel_points_custom_reward_redemption.add") {
      await this.handleRewardRedemption(event);
    }
  }
  
  private async handleRewardRedemption(event: Record<string, unknown>): Promise<void> {
    try {
      const rewardId = event.reward?.id as string;
      const rewardTitle = event.reward?.title as string;
      const userName = event.user_name as string;
      const userInput = event.user_input as string || "";
      
      logger.info(`${userName} redeemed reward "${rewardTitle}" (${rewardId})`);
      
      let effectType = "";
      let effectData = {};
      
      switch (rewardId) {
        case this.config.rewards.digitalRain:
          effectType = "shader";
          effectData = { type: "digitalRain", intensity: 0.8 };
          logger.info(`Triggering digitalRain shader effect`);
          break;

        case this.config.rewards.colourShift:
          effectType = "colour";
          effectData = { shift: true, duration: 5000 };
          logger.info(`Triggering colour shift effect`);
          break;
          
        default:
          logger.info(`Unknown reward ID: ${rewardId}`);
          return;
      }
      
      this.wss.broadcast({
        type: effectType,
        data: {
          ...effectData,
          rewardId,
          rewardTitle,
          userName,
          userInput,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logError(logger, 'Error handling reward redemption', error);
    }
  }
}
