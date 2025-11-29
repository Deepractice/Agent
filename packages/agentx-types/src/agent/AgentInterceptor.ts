/**
 * AgentInterceptor - Output-side interceptor for events
 *
 * Intercepts events before they are dispatched to handlers.
 *
 * Usage:
 * ```typescript
 * agent.intercept((event, next) => {
 *   console.log('Event:', event.type);
 *
 *   // Modify event
 *   if (event.type === 'text_delta') {
 *     event.data.text = maskSensitive(event.data.text);
 *   }
 *
 *   // Continue to handlers (or skip by not calling next)
 *   next(event);
 * });
 * ```
 */

import type { AgentOutput } from "./AgentOutput";

/**
 * Next function to continue the interceptor chain
 */
export type AgentInterceptorNext = (event: AgentOutput) => void;

/**
 * Interceptor function type
 *
 * @param event - The event being dispatched
 * @param next - Call to continue to next interceptor or actual dispatch
 */
export type AgentInterceptor = (event: AgentOutput, next: AgentInterceptorNext) => void;
