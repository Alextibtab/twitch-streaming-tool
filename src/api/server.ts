import { getLogger } from "@std/log/get-logger";
import { Application, Router } from "@oak/oak";
import type { Config } from "../config/config.ts";
import { setupRoutes } from "./routes.ts";
import { setupMiddleware } from "./middleware.ts";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

export async function setupServer(config: Config): Promise<{ app: Application; router: Router }> {
  try {
    const app = new Application();
    const router = new Router();

    setupMiddleware(app);
    setupRoutes(router, config);

    app.use(router.routes());
    app.use(router.allowedMethods());

    app.addEventListener("error", (event) => {
      logger.error(`Server error: ${event.error}`);
    });

    const controller = new AbortController();
    const { signal } = controller;

    const serverPromise = app.listen({
      port: config.port,
      hostname: config.host,
      signal,
    });

    serverPromise.then(() => {
      logger.info(`Server running on ${config.host}:${config.port}`);
    });

    return { app, router };
  } catch (error) {
    logError(logger, 'Failed to setup server', error);
    throw error;
  }
}
