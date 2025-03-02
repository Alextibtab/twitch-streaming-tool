import { getLogger } from "@std/log/get-logger";
import { Application } from "@oak/oak";

import { logError } from "../utils/utils.ts";

const logger = getLogger();

export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
}

export interface WebSocketServerInterface {
  broadcast(message: WebSocketMessage): void;
  getConnections(): WebSocket[];
}

class WebSocketServerImpl implements WebSocketServerInterface {
  private connections: Set<WebSocket> = new Set();

  addConnection(ws: WebSocket): void {
    ws.onopen = (_: Event) => {
      logger.info("New WebSocket client connected");
      this.connections.add(ws);
      ws.send(JSON.stringify({
        type: "connection",
        data: {
          connected: true,
          timestamp: new Date().toISOString(),
        },
      }));
    } 

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        logger.debug(`Recieved message from client: ${JSON.stringify(data)}`);
      } catch (error) {
          logError(logger, 'Error parsing WebSocket message', error);
      }
    };

    ws.onerror = (error: Event) => {
      logError(logger, 'WebSocket error', error);
    }

    ws.onclose = (_: CloseEvent) => {
      logger.info("WebSocket client disconnected");
      this.connections.delete(ws);
    };

  };

  broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  getConnections(): WebSocket[] {
    return [...this.connections];
  }
}

export async function initWebSocketServer(
  app: Application,
  port = 8080,
): Promise<WebSocketServerInterface> {
  const wsServer = new WebSocketServerImpl();
  Deno.serve({ port }, async (request) => {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 400 });
      }

      try {
        const { socket, response } = Deno.upgradeWebSocket(request);
        wsServer.addConnection(socket);
        return response;
      } catch (error) {
        logError(logger, 'WebSocket upgrade error', error);
        if (error instanceof Error) {
          return new Response(`WebSocket upgrade failed: ${error.message}`, { status: 500 });
        }
      }
    }

    try {
      return await app.handle(request);
    } catch (error) {
      logError(logger, 'Error handling request', error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });

  return wsServer;
}
