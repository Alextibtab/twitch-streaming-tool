import { Logger } from "@std/log";

import { ChessComStatsData, LichessUserData } from "../chat/commands/chess.ts";


export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error == 'string' ? error : String(error));
}

export function getErrorMessage(error: unknown): string {
  return ensureError(error).message;
}

export function logError(logger: Logger, message: string, error: unknown): void {
  const err = ensureError(error);
  logger.error(`${message}: ${err.message}`);

  if (error instanceof Error && error.stack) {
    logger.debug(error.stack);
  }
}

export function formatLichessRating(username: string, userData: LichessUserData): string {
  const { perfs } = userData;
  const ratings = [];

  if (perfs.rapid?.rating) ratings.push(`Rapid: ${perfs.rapid.rating}`);
  if (perfs.blitz?.rating) ratings.push(`Blitz: ${perfs.blitz.rating}`);
  if (perfs.bullet?.rating) ratings.push(`Bullet: ${perfs.bullet.rating}`);

  if (ratings.length === 0) {
    return `Lichess: @${username} has no rated games`;
  }

  return `Lichess: @${username} (${ratings.join(', ')})`; 
} 

export function formatChessComRating(username: string, statsData: ChessComStatsData): string {
  const ratings = [];

  if (statsData.chess_rapid?.last?.rating) ratings.push(`Rapid: ${statsData.chess_rapid.last.rating}`);
  if (statsData.chess_blitz?.last?.rating) ratings.push(`Blitz: ${statsData.chess_blitz.last.rating}`);
  if (statsData.chess_bullet?.last?.rating) ratings.push(`Bullet: ${statsData.chess_bullet.last.rating}`);

  if (ratings.length === 0) {
    return `Chessdotcom: @${username} has no rated games`;
  }

  return `Chessdotcom: @${username} (${ratings.join(', ')})`;
}
