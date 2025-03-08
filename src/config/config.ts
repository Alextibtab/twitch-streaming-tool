import { getLogger } from "@std/log/get-logger";
import { load } from "@std/dotenv";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

export interface Config {
  // Server config
  port: number;
  wsPort: number;
  host: string;

  // Twitch API config
  clientId: string;
  clientSecret: string;
  broadcasterId: string;
  channelName: string;
  accessToken: string;
  refreshToken: string;

  // EventSub config
  ngrokAuthToken: string;
  eventSubSecret: string;

  // Chat bot config
  botPrefix: string;
  botName: string;

  // Feature flags
  enableChatBot: boolean;
  enableEventSub: boolean;
  enableWebSocket: boolean;

  // Reward config
  rewards: {
    digitalRain: string;
    colourShift: string;
  };
}

export async function initConfig(): Promise<Config> {
  try {
    await load({ export: true });
    const requiredVars = [
      "TWITCH_CLIENT_ID",
      "TWITCH_CLIENT_SECRET",
      "TWITCH_BROADCASTER_ID",
      "TWITCH_CHANNEL_NAME",
    ];

    for (const varName of requiredVars) {
      if (!Deno.env.get(varName)) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }

    const config: Config = {
      port: parseInt(Deno.env.get("PORT") || "4000"),
      wsPort: parseInt(Deno.env.get("WS_PORT") || "8080"),
      host: Deno.env.get("HOST") || "localhost",

      clientId: Deno.env.get("TWITCH_CLIENT_ID") || "",
      clientSecret: Deno.env.get("TWITCH_CLIENT_SECRET") || "",
      broadcasterId: Deno.env.get("TWITCH_BROADCASTER_ID") || "",
      channelName: Deno.env.get("TWITCH_CHANNEL_NAME") || "",
      accessToken: Deno.env.get("TWITCH_ACCESS_TOKEN") || "",
      refreshToken: Deno.env.get("TWITCH_REFRESH_TOKEN") || "",

      ngrokAuthToken: Deno.env.get("NGROK_AUTH_TOKEN") || "",
      eventSubSecret: Deno.env.get("EVENTSUB_SECRET") || crypto.randomUUID(),

      botPrefix: Deno.env.get("BOT_PREFIX") || "!",
      botName: Deno.env.get("BOT_NAME") || "",

      enableChatBot: Deno.env.get("ENABLE_CHAT_BOT") === "true",
      enableEventSub: Deno.env.get("ENABLE_EVENTSUB") === "true",
      enableWebSocket: Deno.env.get("ENABLE_WEBSOCKET") === "true",

      rewards: {
        digitalRain: Deno.env.get("DIGITAL_RAIN_SHADER") || "",
        colourShift: Deno.env.get("COLOUR_SHIFT") || "",
      },
    };

    const safeConfig: Config = {
      ...config,
      clientSecret: "***REDACTED***",
      accessToken: "***REDACTED***",
      refreshToken: "***REDACTED***",
      eventSubSecret: "***REDACTED***",
      ngrokAuthToken: "***REDACTED***",
    };

    logger.debug(`Initialised config: ${JSON.stringify(safeConfig, null, 2)}`);

    return config;
  } catch (error) {
    logError(logger, 'Failed to initialise config', error);
    throw error;
  }
}
