/**
 * Error emission utility
 *
 * Provides a consistent way for any component to emit error_message events.
 */

import type { ErrorMessage } from "@deepractice-ai/agentx-types";
import type { ErrorMessageEvent } from "@deepractice-ai/agentx-event";
import type { EventProducer } from "./bus/EventProducer";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("core/utils/emitError");

export interface ErrorContext {
  agentId: string;
  sessionId?: string;
  componentName?: string;
}

/**
 * Emit an error_message event
 *
 * Use this utility function from any component to send error events to the EventBus.
 *
 * @example
 * ```typescript
 * catch (error) {
 *   emitError(this.context.producer, error, "validation", {
 *     agentId: this.context.agentId,
 *     componentName: "MessageAssembler"
 *   });
 * }
 * ```
 */
export function emitError(
  producer: EventProducer,
  error: Error | string,
  subtype: "system" | "agent" | "llm" | "validation" | "unknown",
  context: ErrorContext,
  options?: {
    severity?: "fatal" | "error" | "warning";
    code?: string;
    details?: unknown;
    recoverable?: boolean;
  }
): void {
  const severity = options?.severity || "error";
  const code = options?.code || `${subtype.toUpperCase()}_ERROR`;
  const recoverable = options?.recoverable ?? severity !== "fatal";

  const errorMessage: ErrorMessage = {
    id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: "error",
    subtype,
    severity,
    message: error instanceof Error ? error.message : String(error),
    code,
    details: options?.details,
    recoverable,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: Date.now(),
  };

  const errorEvent: ErrorMessageEvent = {
    type: "error_message",
    data: errorMessage,
    uuid: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    agentId: context.agentId,
    timestamp: Date.now(),
  };

  // Log error for debugging
  logger.error("Emitting error event", {
    componentName: context.componentName,
    subtype,
    severity,
    message: errorMessage.message,
    code,
    agentId: context.agentId,
  });

  producer.produce(errorEvent);
}
