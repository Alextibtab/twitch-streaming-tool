import { getLogger } from "@std/log/get-logger";
import type { TwitchChatBot } from "./bot.ts";

const logger = getLogger();

interface EventHandlers {
  onFirstTimeChat?: (channel: string, username: string) => void;
  onSubscription?: (channel: string, username: string, months: number) => void;
  onRaid?: (channel: string, username: string, viewers: number) => void;
  onStreamStart?: (channel: string) => void;
  onStreamEnd?: (channel: string) => void;
}

interface UserState {
  hasSpoken: boolean;
  lastSeen: Date;
}

const userStates = new Map<string, UserState>();

export function registerEventHandlers(bot: TwitchChatBot): void {
  const handlers: EventHandlers = {
    onFirstTimeChat: (channel, username) => {
      bot.say(channel, `Welcome to the stream, ${username}! 👋`);
    },
    
    onSubscription: (channel, username, months) => {
      if (months === 1) {
        bot.say(channel, `Thanks for subscribing, ${username}! 🎉`);
      } else {
        bot.say(channel, `Thanks for resubscribing for ${months} months, ${username}! 🎉`);
      }
    },
    
    onRaid: (channel, username, viewers) => {
      bot.say(channel, `Thank you for the raid, ${username}! Welcome to the stream, all ${viewers} of you! 👋`);
    },
    
    onStreamStart: (channel) => {
      bot.say(channel, `Stream is starting! Let me know if you have any questions about the code, chess, or language learning.`);
    },
    
    onStreamEnd: (channel) => {
      bot.say(channel, `Stream is ending! Thanks for watching!`);
    }
  };
  
  // TODO: Add event listening logic that integrates with your TwitchChatBot
  // For example, you'll want to detect when:
  // - A user chats for the first time
  // - A user subscribes
  // - A raid happens
  // - Stream starts/ends
  // This requires parsing the appropriate IRC messages or using PubSub/EventSub
  
  logger.info("Registered chat event handlers");
}
