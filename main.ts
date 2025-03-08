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
    console: new ConsoleHandler("ERROR"),
  },
  loggers: {
    default: {
      level: "ERROR",
      handlers: ["console"],
    },
  },
});

const logger = getLogger();

async function startApplication() {
  const config = await initConfig();
  const { app, router } = await setupServer(config);
  const wss = await initWebSocketServer(app, config.wsPort);

  // Initialize core services
  const serviceLocator = ServiceLocator.getInstance();
  serviceLocator.register('wsServer', wss);

  await startChatBot(config);
  await setupEventSub(config, router, wss);

  logger.info("Application successfully started! 🚀");


  const signals = ["SIGINT", "SIGTERM"];
  // Keep the application running
  return new Promise((resolve) => {
    for (const signal of signals) {
      Deno.addSignalListener(signal, () => {
        logger.info(`Received ${signal}, shutting down...`);
        resolve(1);
      });
    }
  });
}

try {
  await startApplication();
  Deno.exit(0);
} catch (error) {
  logError(logger, 'Failed to start application', error);
  Deno.exit(1);
}

