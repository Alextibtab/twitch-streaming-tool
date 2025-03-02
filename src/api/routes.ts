import { getLogger } from "@std/log/get-logger";
import { Router } from "@oak/oak";
import type { Config } from "../config/config.ts";
import { TwitchAuthManager } from "../auth/twitch.ts";
import { ApiClient } from "@twurple/api";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

export function setupRoutes(router: Router, config: Config): void {
  router.get("/health", (ctx) => {
    ctx.response.status = 200;
    ctx.response.body = { status: "ok" };
  });

  router.get("/api/rewards", async (ctx) => {
    try {
      const auth = new TwitchAuthManager(config);
      const apiClient = new ApiClient({ authProvider: auth.getAppTokenProvider() });

      const customRewards = await apiClient.channelPoints.getCustomRewards(config.broadcasterId);

      ctx.response.status = 200;
      ctx.response.body = customRewards.map((reward) => ({
        id: reward.id,
        title: reward.title,
        cost: reward.cost,
        prompt: reward.prompt,
      }));
    } catch (error) {
      logError(logger, 'Error fetching rewards', error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to fetch rewards" };
    }
  });

  router.get("/frontend/:path+", async (ctx) => {
    try {
      await ctx.send({
        root: `${Deno.cwd()}/frontend`,
        path: ctx.params.path,
      });
    } catch {
      ctx.response.status = 404;
    }
  });

  router.get("/overlay/chess", async (ctx) => {
    await ctx.send({
      root: `${Deno.cwd()}/frontend`,
      path: "chess-overlay.html",
    });
  });

  router.get("/", async (ctx) => {
    try {
      await ctx.send({
        root: `${Deno.cwd()}/frontend`,
        path: "index.html",
      });
    } catch {
      ctx.response.status = 200;
      ctx.response.body = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Twitch Stream Tools</title>
            <style>
              body {
                font-family: system-ui, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.6;
              }
              .status {
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 20px;
              }
              .status.ok {
                background-color: #d4edda;
                color: #155724;
              }
              .status.warning {
                background-color: #fff3cd;
                color: #856404;
              }
            </style>
          </head>
          <body>
            <h1>Twitch Stream Tools</h1>
            <div class="status ok">
              <strong>Server Status:</strong> Running
            </div>
            <p>
              The server is running correctly. This page is shown because no frontend
              has been built yet.
            </p>
            <h2>Enabled Features</h2>
            <ul>
              <li>Chat Bot: ${config.enableChatBot ? "Enabled" : "Disabled"}</li>
              <li>EventSub: ${config.enableEventSub ? "Enabled" : "Disabled"}</li>
              <li>WebSocket: ${config.enableWebSocket ? "Enabled" : "Disabled"}</li>
            </ul>
            <p>
              <a href="/api/rewards">View Channel Point Rewards</a>
            </p>
          </body>
        </html>
      `;
    }
  });
}
