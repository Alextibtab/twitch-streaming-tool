import { getLogger } from "@std/log/get-logger";
import { Application } from "@oak/oak";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

export function setupMiddleware(app: Application): void {
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    logger.info(
      `${ctx.request.method} ${ctx.request.url.pathname} - ${ctx.response.status} (${ms}ms)`,
    );
  });

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      logError(logger, 'Request error', error);
      ctx.response.status = 500;
      ctx.response.body = {
        error: "Internal Server Error",
      };  
    }
  });

  app.use(async (ctx, next) => {
    try {
      await ctx.send({
        root: `${Deno.cwd()}/frontend`,
        index: "index.html",
      });
    } catch {
      await next();
    }
  });

  app.use(async (ctx, next) => {
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    ctx.response.headers.set(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );

    if (ctx.request.method === "OPTIONS") {
      ctx.response.status = 204;
      return;
    }

    await next();
  });
}
