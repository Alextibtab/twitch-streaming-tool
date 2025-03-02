import { setup } from "@std/log/setup";
import { ConsoleHandler } from "@std/log/console-handler";
import { getLogger } from "@std/log/get-logger";

import { ServiceLocator } from "./src/utils/context.ts";
import { initConfig } from "./src/config/config.ts";
import { setupServer } from "./src/api/server.ts";
import { initWebSocketServer } from "./src/websocket/server.ts";
import { startChatBot } from "./src/chat/bot.ts";
import { setupEventSub } from "./src/eventsub/setup.ts";
import { logError } from "./src/utils/utils.ts";

setup({
  handlers: {
    console: new ConsoleHandler("INFO"),
  },
  loggers: {
    default: {
      level: "INFO",
      handlers: ["console"],
    },
  },
});

const logger = getLogger();

try {
  const config = await initConfig();
  const { app, router } = await setupServer(config);
  const wss = await initWebSocketServer(app, config.wsPort);

  ServiceLocator.getInstance().register('wsServer', wss);

  await startChatBot(config);
  await setupEventSub(config, router, wss);

  await new Promise(() => {});
} catch (error) {
  logError(logger, 'Failed to start application', error);
  Deno.exit(1);
}

