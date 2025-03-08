import { getLogger } from "@std/log/get-logger";
import type { ChatMessage } from "../bot.ts";
import { WebSocketServerInterface, WebSocketMessage } from "../../websocket/server.ts";
import { logError, formatChessComRating, formatLichessRating } from "../../utils/utils.ts";
import { ServiceLocator } from "../../utils/context.ts";

const logger = getLogger();

export interface LichessUserData {
  id: string;
  username: string;
  perfs: {
    blitz?: { rating: number; games: number };
    bullet?: { rating: number; games: number };
    rapid?: { rating: number; games: number }
    classical?: { rating: number; games: number };
  };
  profile?: {
    country?: string;
  };
  url?: string;
}

export interface ChessComUserData {
  player_id: number;
  username: string;
  url?: string;
}

export interface ChessComStatsData {
  chess_rapid?: { last: { rating: number } };
  chess_blitz?: { last: { rating: number } };
  chess_bullet?: { last: { rating: number } };
}

const userCache: Record<string, {
  lichess?: { data: LichessUserData; timestamp: number };
  chesscomProfile?: { data: ChessComUserData; timestamp: number };
  chesscomStats?: { data: ChessComStatsData; timestamp: number };
}> = {};

const CACHE_DURATION = 60 * 60 * 1000;

export async function handleChessCommand(message: ChatMessage): Promise<string | null> {
  const { user, message: text } = message.data;
  const args = text.split(" ").slice(1);
  const subCommand = args[0]?.toLowerCase();
  
  switch (subCommand) {
    case "rating": {
      const targetUser = args[1] || user.login;  
      return await handleRatingCommand(targetUser);
    }

    case "help":
    default:
      return `Chess commands: !chess rating [username]`;
  }
}

async function handleRatingCommand(username: string): Promise<string> {
  try {
    const now = Date.now();
    const results = [];

    if (!userCache[username]) {
      userCache[username] = {};
    }

    const overlayData: {
      username: string;
      lichess?: {
        found: boolean;
        rapid?: number;
        blitz?: number;
        bullet?: number;
        url?: string;
      };
      chesscom?: {
        found: boolean;
        rapid?: number;
        blitz?: number;
        bullet?: number;
        url?: string;
      }
    } = {
        username: username
      };

    try {
      const lichessCache = userCache[username].lichess;
      let lichessData: LichessUserData | null = null;

      if (lichessCache && now - lichessCache?.timestamp < CACHE_DURATION) {
        logger.info("using lichess cache");
        lichessData = lichessCache.data;
      } else {
        const response = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`);

        if (response.ok) {
          lichessData = await response.json();
          userCache[username].lichess = { data: lichessData, timestamp: now };
        }  else if (response.status !== 404) {
          logger.error(`Lichess API error: ${response.status} ${response.statusText}`);
        }
      }

      if (lichessData) {
        results.push(formatLichessRating(lichessData));

        overlayData.lichess = {
          found: true,
          rapid: lichessData.perfs.rapid?.rating,
          blitz: lichessData.perfs.blitz?.rating,
          bullet: lichessData.perfs.bullet?.rating,
          url: lichessData.url
        };
      } else {
        overlayData.lichess = { found: false };
      }
    } catch (error) {
      logError(logger, "Error fetching Lichess data", error);
      overlayData.lichess = { found: false };
    }

    try {
      const profileCache = userCache[username].chesscomProfile;
      let profileData: ChessComUserData | null = null;

      if (profileCache && now - profileCache.timestamp < CACHE_DURATION) {
        profileData = profileCache.data;
      } else {
        const profileResponse = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`);

        if (profileResponse.ok) {
          profileData = await profileResponse.json();
          userCache[username].chesscomProfile = { data: profileData, timestamp: now };
        }
      }

      const statsCache = userCache[username].chesscomStats;
      let statsData: ChessComStatsData | null = null;

      if (statsCache && now - statsCache.timestamp < CACHE_DURATION) {
        logger.info("Chess[.]com cache used");
        statsData = statsCache.data;
      } else if (profileData) {
        const statsResponse = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/stats`);

        if (statsResponse.ok) {
          statsData = await statsResponse.json();
          userCache[username].chesscomStats = { data: statsData, timestamp: now};
        }
      }
      
      if (profileData && statsData) {
        results.push(formatChessComRating(statsData));

        overlayData.chesscom = {
          found: true,
          rapid: statsData.chess_rapid?.last?.rating,
          blitz: statsData.chess_blitz?.last?.rating,
          bullet: statsData.chess_bullet?.last?.rating,
          url: profileData.url
        };
      } else {
        overlayData.chesscom = { found: false };
      }
    } catch (error) {
      logError(logger, 'Error fetching chess[.]com data', error);
      overlayData.chesscom = { found: false };
    }

    const websocketServer: WebSocketServerInterface = ServiceLocator.getInstance().get('wsServer');

    if (websocketServer) {
      const message: WebSocketMessage = {
        type: "chess_rating",
        data: overlayData
      };
      websocketServer.broadcast(message);
    }

    if (results.length > 0) {
      return `${username} - ${results.join(" | ")}`;
    } else {
      return `${username} not found on Lichess or Chess[.]com. Make sure the username is correct.`;
    }
  } catch (error) {
    logError(logger, 'Error in handleRatingCommand', error);
    return `Sorry, couldn't retrieve ratings for ${username}. Please try again later.`;
  }
}

// Export the command handler
export default {
  name: "chess",
  handler: handleChessCommand
};
