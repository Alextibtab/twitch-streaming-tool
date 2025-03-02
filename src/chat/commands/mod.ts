import { getLogger } from "@std/log/get-logger";
import type { ChatMessage } from "../bot.ts";

import chessCommand from "./chess.ts";

const logger = getLogger();

export type CommandHandler = (message: ChatMessage) => Promise<string | null>;
const commandHandlers = new Map<string, CommandHandler>();

export async function loadCommands(): Promise<Map<string, CommandHandler>> {
  try {
    commandHandlers.set(chessCommand.name, chessCommand.handler);
    commandHandlers.set("help", handleHelpCommand);
    
    logger.info(`Loaded ${commandHandlers.size} command handlers`);
    
    return commandHandlers;
  } catch (error) {
    logger.error(`Error loading commands: ${error.message}`);
    throw error;
  }
}

async function handleHelpCommand(message: ChatMessage): Promise<string> {
  const commands = Array.from(commandHandlers.keys())
    .filter(cmd => cmd !== "help")
    .map(cmd => `!${cmd}`)
    .join(", ");
  
  return `Available commands: ${commands}, !help`;
}
