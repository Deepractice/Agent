/**
 * Hono Adapter
 *
 * Adapts AgentXHandler to Hono middleware.
 * Hono already uses Web Standard Request/Response, so this is mostly a convenience wrapper.
 *
 * @example
 * ```typescript
 * import { Hono } from "hono";
 * import { agentx } from "@deepractice-ai/agentx";
 * import { createAgentXHandler } from "@deepractice-ai/agentx/server";
 * import { toHonoHandler, createHonoRoutes } from "@deepractice-ai/agentx/server/adapters/hono";
 *
 * const app = new Hono();
 * const handler = createAgentXHandler(agentx);
 *
 * // Option 1: Simple catch-all
 * app.all("/agentx/*", toHonoHandler(handler));
 *
 * // Option 2: Mount as sub-app
 * app.route("/agentx", createHonoRoutes(handler));
 *
 * export default app;
 * ```
 */

import type { AgentXHandler } from "../types";

/**
 * Hono Context interface (minimal)
 */
interface HonoContext {
  req: {
    raw: Request;
    url: string;
    method: string;
    path: string;
  };
  // Return response
  body: (data: ReadableStream | string | ArrayBuffer | null, init?: ResponseInit) => Response;
  json: (data: unknown, init?: ResponseInit) => Response;
  text: (data: string, init?: ResponseInit) => Response;
}

/**
 * Hono handler type
 */
export type HonoHandler = (c: HonoContext) => Response | Promise<Response>;

/**
 * Convert AgentXHandler to Hono handler
 *
 * Since Hono uses Web Standard Request/Response natively,
 * this adapter is straightforward.
 *
 * @param handler - AgentX handler
 * @returns Hono handler function
 */
export function toHonoHandler(handler: AgentXHandler): HonoHandler {
  return async (c) => {
    // Hono provides the raw Web Request directly
    return handler(c.req.raw);
  };
}

/**
 * Hono-like app interface (minimal for sub-routing)
 */
interface HonoLike {
  all(path: string, handler: HonoHandler): HonoLike;
  get(path: string, handler: HonoHandler): HonoLike;
  post(path: string, handler: HonoHandler): HonoLike;
  delete(path: string, handler: HonoHandler): HonoLike;
}

/**
 * Create a Hono sub-app with all AgentX routes
 *
 * This creates explicit routes for better type safety and documentation.
 *
 * @param handler - AgentX handler
 * @param HonoClass - Hono class constructor (optional, for tree-shaking)
 * @returns Hono app with all routes configured
 *
 * @example
 * ```typescript
 * import { Hono } from "hono";
 * import { createHonoRoutes } from "@deepractice-ai/agentx/server/adapters/hono";
 *
 * const app = new Hono();
 * app.route("/agentx", createHonoRoutes(handler, Hono));
 * ```
 */
export function createHonoRoutes<T extends HonoLike>(
  handler: AgentXHandler,
  HonoClass: new () => T
): T {
  const app = new HonoClass();
  const honoHandler = toHonoHandler(handler);

  // Platform routes
  app.get("/info", honoHandler);
  app.get("/health", honoHandler);

  // Agent collection routes
  app.get("/agents", honoHandler);
  app.post("/agents", honoHandler);

  // Agent instance routes
  app.get("/agents/:agentId", honoHandler);
  app.delete("/agents/:agentId", honoHandler);
  app.get("/agents/:agentId/sse", honoHandler);
  app.post("/agents/:agentId/messages", honoHandler);
  app.post("/agents/:agentId/interrupt", honoHandler);

  // Catch-all for any missed routes
  app.all("/*", honoHandler);

  return app;
}

/**
 * Simple Hono middleware that forwards all requests to handler
 *
 * Use this when you want a simple catch-all without explicit routing.
 *
 * @param handler - AgentX handler
 * @returns Hono handler
 */
export function createHonoAdapter(handler: AgentXHandler): HonoHandler {
  return toHonoHandler(handler);
}
