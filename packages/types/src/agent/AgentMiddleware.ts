/**
 * AgentMiddleware - Input-side interceptor for receive()
 *
 * Intercepts user messages before they are processed by the driver.
 *
 * Usage:
 * ```typescript
 * agent.use(async (message, next) => {
 *   console.log('[Before]', message.content);
 *   await next(message);
 *   console.log('[After]');
 * });
 * ```
 */

import type { UserMessage } from "~/agent/message";

/**
 * Next function to continue the middleware chain
 */
export type AgentMiddlewareNext = (message: UserMessage) => Promise<void>;

/**
 * Middleware function type
 *
 * @param message - The user message being processed
 * @param next - Call to continue to next middleware or actual receive
 */
export type AgentMiddleware = (message: UserMessage, next: AgentMiddlewareNext) => Promise<void>;
