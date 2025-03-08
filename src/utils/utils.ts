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

export function formatLichessRating(userData: LichessUserData): string {
  const { perfs } = userData;
  const ratings = [];

  if (perfs.rapid?.rating) ratings.push(`⏱️: ${perfs.rapid.rating}`);
  if (perfs.blitz?.rating) ratings.push(`🌩️: ${perfs.blitz.rating}`);
  if (perfs.bullet?.rating) ratings.push(`🚅: ${perfs.bullet.rating}`);

  if (ratings.length === 0) {
    return `Lichess: has no rated games`;
  }

  return `Lichess: (${ratings.join(', ')})`; 
} 

export function formatChessComRating(statsData: ChessComStatsData): string {
  const ratings = [];

  if (statsData.chess_rapid?.last?.rating) ratings.push(`⏱️: ${statsData.chess_rapid.last.rating}`);
  if (statsData.chess_blitz?.last?.rating) ratings.push(`🌩️: ${statsData.chess_blitz.last.rating}`);
  if (statsData.chess_bullet?.last?.rating) ratings.push(`🚅: ${statsData.chess_bullet.last.rating}`);

  if (ratings.length === 0) {
    return `Chess[.]com: has no rated games`;
  }

  return `Chess[.]com: (${ratings.join(', ')})`;
}
