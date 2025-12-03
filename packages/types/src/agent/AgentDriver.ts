/**
 * AgentDriver - Message Processing Interface
 *
 * AgentDriver is a pure message processor.
 * It receives user messages and yields stream events.
 *
 * Key Design:
 * - One Agent = One Driver instance
 * - Driver only handles message processing
 * - Lifecycle management is Container's responsibility
 * - Resume/history is Container's responsibility
 *
 * @example
 * ```typescript
 * class ClaudeDriver implements AgentDriver {
 *   readonly name = "ClaudeDriver";
 *
 *   async *receive(message: UserMessage) {
 *     const stream = this.client.messages.stream({
 *       model: "claude-sonnet-4-20250514",
 *       messages: [{ role: "user", content: message.content }],
 *     });
 *
 *     for await (const chunk of stream) {
 *       yield transformToStreamEvent(chunk);
 *     }
 *   }
 *
 *   interrupt() {
 *     this.abortController.abort();
 *   }
 * }
 * ```
 */

import type { StreamEventType } from "~/agent/event";
import type { UserMessage } from "~/agent/message";

/**
 * AgentDriver interface
 *
 * A message processor that receives user messages and yields stream events.
 * Lifecycle (creation, resume, destruction) is managed by Container.
 */
export interface AgentDriver {
  /**
   * Driver name (for identification and logging)
   */
  readonly name: string;

  /**
   * Optional description
   */
  readonly description?: string;

  /**
   * Receive a user message and yield stream events
   *
   * @param message - User message to process
   * @returns AsyncIterable of stream events
   */
  receive(message: UserMessage): AsyncIterable<StreamEventType>;

  /**
   * Interrupt the current operation
   *
   * Stops the current receive() operation gracefully.
   * Driver should abort any ongoing requests.
   */
  interrupt(): void;
}
