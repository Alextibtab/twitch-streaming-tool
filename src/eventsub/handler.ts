import { getLogger } from "@std/log/get-logger";
import { Application } from "@oak/oak";
import { ApiClient } from "@twurple/api";
import { 
  EventSubHttpListener
} from "@twurple/eventsub-http";
import { NgrokAdapter } from "@twurple/eventsub-ngrok";

import type { Config } from "../config/config.ts";
import type { WebSocketServerInterface } from "../websocket/server.ts";
import { logError } from "../utils/utils.ts";

const logger = getLogger();

export class EventSubHandler {
  private config: Config;
  private wss: WebSocketServerInterface;
  private apiClient: ApiClient;
  private listener: EventSubHttpListener;
  
  constructor(config: Config, wss: WebSocketServerInterface, apiClient: ApiClient) {
    this.config = config;
    this.wss = wss;
    this.apiClient = apiClient;
    
    const adapter = new NgrokAdapter({
      ngrokAuthToken: config.ngrokAuthToken,
      pathPrefix: '/eventsub'
    });
    
    this.listener = new EventSubHttpListener({
      apiClient,
      adapter,
      secret: this.config.eventSubSecret,
      logger: {
        debug: (msg) => logger.debug(msg),
        info: (msg) => logger.info(msg),
        warn: (msg) => logger.warn(msg),
        error: (msg, error) => logError(logger, msg, error)
      }
    });
  }
  
  /**
   * Initialize the EventSub listener and subscribe to events
   */
  async initialize(app: Application): Promise<void> {
    try {
      // Start the listener - this will start ngrok and create the tunnel
      await this.listener.start();
      
      // The NgrokAdapter automatically creates a tunnel and handles the HTTP requests
      // We don't need to manually set up routes with Oak for this
      logger.info("EventSub listener started");
      
      // Subscribe to channel point redemption events
      await this.subscribeToEvents();
      
      logger.info("EventSub handler initialized successfully");
    } catch (error) {
      logError(logger, "Failed to initialize EventSub handler", error);
      throw error;
    }
  }
  
  /**
   * Subscribe to channel point redemption events
   */
  private async subscribeToEvents(): Promise<void> {
    try {
      // Get the broadcaster ID
      const user = await this.apiClient.users.getUserByName(this.config.channelName);
      if (!user) {
        throw new Error(`Could not find user: ${this.config.channelName}`);
      }
      
      const broadcasterId = user.id;
      logger.info(`Subscribing to events for broadcaster: ${this.config.channelName} (${broadcasterId})`);
      
      // Subscribe to channel point redemptions
      // This automatically handles verification and subscription management
      const subscription = await this.listener.onChannelRedemptionAdd(
        broadcasterId,
        (event) => this.handleRewardRedemption(event)
      );
      
      logger.info(`Subscribed to channel point redemptions with ID: ${subscription.id}`);
    } catch (error) {
      logError(logger, "Failed to subscribe to events", error);
      throw error;
    }
  }

  /**
   * Handle channel point reward redemptions
   */
  private handleRewardRedemption(event) {
    try {
      // Log the event details
      logger.info(`Reward redeemed: ${event.rewardTitle} by ${event.userDisplayName}`);
      
      // Send the event to connected clients via WebSocket
      this.wss.broadcast({
        type: "reward_redeemed",
        data: {
          rewardId: event.rewardId,
          rewardTitle: event.rewardTitle,
          userName: event.userDisplayName,
          userInput: event.input || "",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logError(logger, 'Error handling reward redemption', error);
    }
  }
  
  /**
   * Clean up resources when shutting down
   */
  async shutdown(): Promise<void> {
    try {
      // Stop the listener - this will also stop ngrok
      await this.listener.stop();
      logger.info("EventSub listener stopped");
    } catch (error) {
      logError(logger, "Error shutting down EventSub listener", error);
    }
  }
}
