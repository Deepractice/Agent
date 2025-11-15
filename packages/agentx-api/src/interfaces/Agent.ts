/**
 * Agent Interface
 *
 * Core Agent interface for the AgentX ecosystem.
 * Provides methods for sending messages, listening to events, and managing agent lifecycle.
 */

import type { Message } from "@deepractice-ai/agentx-types";
import type { EventType, EventPayload } from "~/events";

/**
 * Agent instance
 *
 * Represents an active agent session with message history and event handling.
 */
export interface Agent {
  /**
   * Unique identifier for this agent instance
   */
  readonly id: string;

  /**
   * Session identifier for this conversation
   */
  readonly sessionId: string;

  /**
   * Readonly access to conversation history
   */
  readonly messages: ReadonlyArray<Message>;

  /**
   * Send a message to the agent
   *
   * This method is async but returns Promise<void>.
   * All responses are delivered through events, not return values.
   *
   * @param message - User message to send
   * @throws {AgentConfigError} If agent is not properly configured
   * @throws {AgentAbortError} If operation is aborted
   *
   * @example
   * ```typescript
   * agent.on("assistant_message", (event) => {
   *   console.log("Assistant:", event.message.content);
   * });
   *
   * await agent.send("Hello!");
   * ```
   */
  send(message: string): Promise<void>;

  /**
   * Register an event handler
   *
   * @param event - Event type to listen for
   * @param handler - Event handler function
   * @returns Unregister function to remove this handler
   *
   * @example
   * ```typescript
   * const unregister = agent.on("result", (event) => {
   *   if (event.subtype === "success") {
   *     console.log("Total cost:", event.totalCostUsd);
   *   }
   * });
   *
   * // Later, unregister the handler
   * unregister();
   * ```
   */
  on<T extends EventType>(event: T, handler: (payload: EventPayload<T>) => void): () => void;

  /**
   * Unregister an event handler
   *
   * @param event - Event type
   * @param handler - Event handler to remove
   */
  off<T extends EventType>(event: T, handler: (payload: EventPayload<T>) => void): void;

  /**
   * Clear conversation history and abort current operation
   */
  clear(): void;

  /**
   * Destroy agent instance and clean up resources
   */
  destroy(): void;
}
