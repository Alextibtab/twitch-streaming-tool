import { getLogger } from "@std/log/get-logger";
import { ChatClient } from "@twurple/chat";
import type { Config } from "../config/config.ts";
import { TwitchAuthManager } from "../auth/twitch.ts";
import { loadCommands } from "./commands/mod.ts";
import { registerEventHandlers } from "./events.ts";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

export interface ChatMessage {
  type: string;
  data: {
    channel: string;
    user: {
      id: string;
      login: string;
      displayName: string;
      isMod: boolean;
      isBroadcaster: boolean;
      isSubscriber: boolean;
      badges: Record<string, string>;
    };
    message: string;
    id: string;
    timestamp: string;
  };
}

export class TwitchChatBot {
  private config: Config;
  private auth: TwitchAuthManager;
  private chatClient: ChatClient | null = null;
  private commands: Map<string, (message: ChatMessage) => Promise<string | null>>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  constructor(config: Config, auth: TwitchAuthManager) {
    this.config = config;
    this.auth = auth;
    this.commands = new Map();
  }
 
  async connect(): Promise<void> {
    try {
      // Get user auth provider
      const authProvider = await this.auth.getUserAuthProvider();
      
      // Create chat client
      this.chatClient = new ChatClient({
        authProvider,
        channels: [this.config.channelName],
        requestMembershipEvents: true
      });
      
      // Set up event handlers
      this.chatClient.onConnect(() => {
        logger.info(`Connected to Twitch chat as ${this.config.botName}`);
        this.reconnectAttempts = 0;
      });
      
      this.chatClient.onDisconnect((manually, reason) => {
        logger.warn(`Disconnected from Twitch chat: ${reason}`);
        
        if (!manually) {
          this.attemptReconnect();
        }
      });
      
      // Handle messages
      this.chatClient.onMessage(this.handleMessage.bind(this));
      
      // Register commands
      await this.registerCommands();
      
      // Register event handlers
      registerEventHandlers(this);
      
      // Connect to Twitch
      await this.chatClient.connect();
      logger.info("Chat client connected");
      
    } catch (error) {
      logError(logger, 'Failed to connect to Twitch chat', error);
      this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Maximum reconnect attempts reached");
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
 
  private async handleMessage(channel: string, user: string, text: string, msg: any): Promise<void> {
    try {
      // Parse to our standard message format
      const message: ChatMessage = {
        type: "chat",
        data: {
          channel: channel.replace("#", ""),
          user: {
            id: msg.userInfo.userId,
            login: user,
            displayName: msg.userInfo.displayName || user,
            isMod: msg.userInfo.isMod,
            isBroadcaster: msg.userInfo.isBroadcaster,
            isSubscriber: msg.userInfo.isSubscriber,
            badges: msg.userInfo.badges
          },
          message: text,
          id: msg.id,
          timestamp: new Date().toISOString(),
        }
      };
      
      // Handle commands
      const prefix = this.config.botPrefix;
      
      if (text.startsWith(prefix)) {
        const commandName = text.split(" ")[0].slice(prefix.length).toLowerCase();
        const command = this.commands.get(commandName);
        
        if (command) {
          logger.info(`Executing command: ${commandName} from ${user}`);
          
          const response = await command(message);
          
          if (response) {
            this.say(channel.replace("#", ""), response);
          }
        }
      }
    } catch (error) {
      logError(logger, 'Error handling message', error);
    }
  }
 
  say(channel: string, message: string): void {
    if (!this.chatClient) {
      logger.error("Cannot send message: Not connected to Twitch");
      return;
    }
    
    this.chatClient.say(channel, message);
  }
 
  private async registerCommands(): Promise<void> {
    try {
      const commands = await loadCommands();
      for (const [name, handler] of commands) {
        this.commands.set(name, handler);
      }
      
      logger.info(`Registered ${this.commands.size} bot commands`);
    } catch (error) {
      logError(logger, 'Failed to register commands', error);
    }
  }
 
  disconnect(): void {
    if (this.chatClient) {
      this.chatClient.quit();
      logger.info("Disconnected from Twitch chat");
    }
  }
 
  getChatClient(): ChatClient | null {
    return this.chatClient;
  }
}

export async function startChatBot(config: Config): Promise<TwitchChatBot | null> {
  if (!config.enableChatBot) {
    logger.info("Chat bot is disabled, skipping initialization");
    return null;
  }
  
  try {
    const auth = new TwitchAuthManager(config);
    const chatBot = new TwitchChatBot(config, auth);
    
    await chatBot.connect();
    return chatBot;
  } catch (error) {
    logError(logger, 'Failed to start chat bot', error);
    return null;
  }
}
