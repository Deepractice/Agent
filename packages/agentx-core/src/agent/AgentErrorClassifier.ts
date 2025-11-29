/**
 * AgentErrorClassifier
 *
 * Handles error classification and AgentError/ErrorMessageEvent creation.
 * Classifies unknown errors into structured AgentError categories.
 */

import type { AgentError, ErrorMessageEvent } from "@deepractice-ai/agentx-types";

/**
 * AgentErrorClassifier - Error classification and event creation
 */
export class AgentErrorClassifier {
  constructor(private readonly agentId: string) {}

  /**
   * Classify an unknown error into an AgentError
   */
  classify(error: unknown): AgentError {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message;

    // LLM errors
    if (message.includes("rate limit") || message.includes("429")) {
      return this.create("llm", "RATE_LIMITED", message, true, err);
    }
    if (
      message.includes("api key") ||
      message.includes("401") ||
      message.includes("unauthorized")
    ) {
      return this.create("llm", "INVALID_API_KEY", message, false, err);
    }
    if (message.includes("context") && message.includes("long")) {
      return this.create("llm", "CONTEXT_TOO_LONG", message, true, err);
    }
    if (message.includes("overloaded") || message.includes("503")) {
      return this.create("llm", "OVERLOADED", message, true, err);
    }

    // Network errors
    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return this.create("network", "TIMEOUT", message, true, err);
    }
    if (message.includes("ECONNREFUSED") || message.includes("connection")) {
      return this.create("network", "CONNECTION_FAILED", message, true, err);
    }
    if (message.includes("network") || message.includes("fetch")) {
      return this.create("network", "CONNECTION_FAILED", message, true, err);
    }

    // Driver errors
    if (message.includes("driver")) {
      return this.create("driver", "RECEIVE_FAILED", message, true, err);
    }

    // Default to system error
    return this.create("system", "UNKNOWN", message, true, err);
  }

  /**
   * Create an AgentError with the specified category and code
   */
  create(
    category: AgentError["category"],
    code: string,
    message: string,
    recoverable: boolean,
    cause?: Error
  ): AgentError {
    return {
      category,
      code,
      message,
      severity: recoverable ? "error" : "fatal",
      recoverable,
      cause,
    } as AgentError;
  }

  /**
   * Create an ErrorMessageEvent from an AgentError
   */
  createEvent(error: AgentError): ErrorMessageEvent {
    return {
      type: "error_message",
      uuid: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      agentId: this.agentId,
      timestamp: Date.now(),
      data: {
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "system",
        subtype: "error",
        error,
        timestamp: Date.now(),
      },
    };
  }
}
