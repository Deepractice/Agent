/**
 * Next.js App Router Adapter
 *
 * Adapts AgentXHandler to Next.js App Router route handlers.
 * Next.js App Router uses Web Standard Request/Response natively.
 *
 * @example
 * ```typescript
 * // app/api/agentx/[...path]/route.ts
 * import { agentx } from "@deepractice-ai/agentx";
 * import { createAgentXHandler } from "@deepractice-ai/agentx/server";
 * import { createNextHandler } from "@deepractice-ai/agentx/server/adapters/next";
 *
 * const handler = createAgentXHandler(agentx, {
 *   basePath: "/api/agentx",
 * });
 *
 * export const { GET, POST, DELETE } = createNextHandler(handler);
 *
 * // Enable streaming for SSE
 * export const dynamic = "force-dynamic";
 * ```
 */

import type { AgentXHandler } from "../types";

/**
 * Next.js route context
 */
interface NextRouteContext {
  params: Record<string, string | string[]>;
}

/**
 * Next.js route handler type
 */
export type NextRouteHandler = (
  request: Request,
  context?: NextRouteContext
) => Response | Promise<Response>;

/**
 * Next.js route handlers object
 */
export interface NextRouteHandlers {
  GET: NextRouteHandler;
  POST: NextRouteHandler;
  DELETE: NextRouteHandler;
  PUT: NextRouteHandler;
  PATCH: NextRouteHandler;
  HEAD: NextRouteHandler;
  OPTIONS: NextRouteHandler;
}

/**
 * Create Next.js App Router route handlers
 *
 * @param handler - AgentX handler
 * @returns Object with GET, POST, DELETE, etc. handlers
 *
 * @example
 * ```typescript
 * // app/api/agentx/[...path]/route.ts
 * import { createNextHandler } from "@deepractice-ai/agentx/server/adapters/next";
 *
 * const handler = createAgentXHandler(agentx, {
 *   basePath: "/api/agentx",
 * });
 *
 * export const { GET, POST, DELETE } = createNextHandler(handler);
 * ```
 */
export function createNextHandler(handler: AgentXHandler): NextRouteHandlers {
  // All methods use the same handler since routing is done by AgentXHandler
  const routeHandler: NextRouteHandler = async (request) => {
    return handler(request);
  };

  return {
    GET: routeHandler,
    POST: routeHandler,
    DELETE: routeHandler,
    PUT: routeHandler,
    PATCH: routeHandler,
    HEAD: routeHandler,
    OPTIONS: routeHandler,
  };
}

/**
 * Create a single Next.js handler for all methods
 *
 * Use this if you prefer to handle all methods with one export.
 *
 * @param handler - AgentX handler
 * @returns Single route handler
 *
 * @example
 * ```typescript
 * // app/api/agentx/[...path]/route.ts
 * import { toNextHandler } from "@deepractice-ai/agentx/server/adapters/next";
 *
 * const handler = toNextHandler(createAgentXHandler(agentx));
 *
 * export { handler as GET, handler as POST, handler as DELETE };
 * ```
 */
export function toNextHandler(handler: AgentXHandler): NextRouteHandler {
  return async (request) => handler(request);
}

/**
 * Next.js Edge Runtime compatible handler
 *
 * Use this for edge functions deployment.
 *
 * @param handler - AgentX handler
 * @returns Edge-compatible handler
 *
 * @example
 * ```typescript
 * // app/api/agentx/[...path]/route.ts
 * import { createNextEdgeHandler } from "@deepractice-ai/agentx/server/adapters/next";
 *
 * export const runtime = "edge";
 * export const { GET, POST, DELETE } = createNextEdgeHandler(handler);
 * ```
 */
export function createNextEdgeHandler(handler: AgentXHandler): NextRouteHandlers {
  // Edge runtime also uses Web Standard Request/Response
  return createNextHandler(handler);
}

/**
 * Convenience export for route.ts files
 *
 * @example
 * ```typescript
 * // app/api/agentx/[...path]/route.ts
 * import { createAgentXRoutes } from "@deepractice-ai/agentx/server/adapters/next";
 *
 * const { GET, POST, DELETE } = createAgentXRoutes(agentx, {
 *   basePath: "/api/agentx",
 * });
 *
 * export { GET, POST, DELETE };
 * export const dynamic = "force-dynamic";
 * ```
 */
export { createNextHandler as createAgentXRoutes };
