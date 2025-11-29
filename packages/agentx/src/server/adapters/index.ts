/**
 * Framework Adapters
 *
 * Adapters to integrate AgentXHandler with various web frameworks.
 *
 * @example
 * ```typescript
 * // Express
 * import { toExpressHandler } from "@deepractice-ai/agentx/server/adapters/express";
 * app.use("/agentx", toExpressHandler(handler));
 *
 * // Hono
 * import { toHonoHandler } from "@deepractice-ai/agentx/server/adapters/hono";
 * app.all("/agentx/*", toHonoHandler(handler));
 *
 * // Next.js
 * import { createNextHandler } from "@deepractice-ai/agentx/server/adapters/next";
 * export const { GET, POST, DELETE } = createNextHandler(handler);
 * ```
 *
 * @packageDocumentation
 */

// Express adapter
export { toExpressHandler, createExpressAdapter, type ExpressHandler } from "./express";

// Hono adapter
export { toHonoHandler, createHonoRoutes, createHonoAdapter, type HonoHandler } from "./hono";

// Next.js adapter
export {
  createNextHandler,
  toNextHandler,
  createNextEdgeHandler,
  createAgentXRoutes,
  type NextRouteHandler,
  type NextRouteHandlers,
} from "./next";
