/**
 * AgentX Server Module
 *
 * Provides HTTP handlers for exposing AgentX agents over the network.
 * Based on Web Standards (Request/Response) for framework-agnostic usage.
 *
 * @example
 * ```typescript
 * import { agentx } from "@deepractice-ai/agentx";
 * import { createAgentXHandler } from "@deepractice-ai/agentx/server";
 *
 * // Create handler
 * const handler = createAgentXHandler(agentx);
 *
 * // Use with Express (needs adapter)
 * app.use("/agentx", toExpressHandler(handler));
 *
 * // Use with Hono (native support)
 * app.all("/agentx/*", (c) => handler(c.req.raw));
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  // Transport
  TransportType,
  ConnectionState,
  TransportConnection,
  // Handler
  AgentXHandler,
  AgentXHandlerOptions,
  AgentXHandlerHooks,
  CorsOptions,
  // Request/Response
  ParsedRequest,
  RequestType,
  // API Types
  PlatformInfoResponse,
  HealthResponse,
  AgentListResponse,
  AgentInfoResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  SendMessageRequest,
  SendMessageResponse,
  InterruptResponse,
  ErrorResponse,
  ErrorCode,
} from "./types";

// Handler
export { createAgentXHandler, type AgentXHandlerWithUtils } from "./createAgentXHandler";

// SSE Transport
export { SSEConnection, SSEConnectionManager } from "./SSETransport";

// Framework Adapters (re-exported for convenience)
export {
  // Express
  toExpressHandler,
  createExpressAdapter,
  type ExpressHandler,
  // Hono
  toHonoHandler,
  createHonoRoutes,
  createHonoAdapter,
  type HonoHandler,
  // Next.js
  createNextHandler,
  toNextHandler,
  createNextEdgeHandler,
  createAgentXRoutes,
  type NextRouteHandler,
  type NextRouteHandlers,
} from "./adapters";
