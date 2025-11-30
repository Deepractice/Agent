/**
 * AgentDriver - Stateful Driver interface
 *
 * AgentDriver is a STATEFUL driver that manages its own lifecycle.
 * Each Agent instance has its own Driver instance.
 *
 * Key Design:
 * - One Agent = One Driver instance
 * - Driver manages its own state (connections, sessions, etc.)
 * - Context is passed at construction time
 * - Lifecycle tied to Agent lifecycle
 *
 * @example
 * ```typescript
 * class ClaudeDriver implements AgentDriver {
 *   private client: Anthropic;
 *   private context: AgentContext;
 *
 *   constructor(context: AgentContext) {
 *     this.context = context;
 *     this.client = new Anthropic({ apiKey: context.config.apiKey });
 *   }
 *
 *   async *receive(message: UserMessage) {
 *     const stream = this.client.messages.stream({
 *       model: this.context.config.model || "claude-sonnet-4-20250514",
 *       messages: [{ role: "user", content: message.content }],
 *     });
 *
 *     for await (const chunk of stream) {
 *       yield transformToStreamEvent(chunk);
 *     }
 *   }
 *
 *   async destroy() {
 *     // Cleanup resources
 *   }
 * }
 * ```
 */

import type { StreamEventType } from "~/event";
import type { UserMessage } from "~/message";
import type { AgentContext } from "./AgentContext";

/**
 * AgentDriver interface
 *
 * A stateful driver that receives user messages and yields stream events.
 * Each driver instance is bound to a single Agent.
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
   * Driver should abort any ongoing requests and clean up state.
   */
  interrupt(): void;

  /**
   * Destroy the driver and cleanup resources
   *
   * Called when the Agent is destroyed.
   */
  destroy(): Promise<void>;
}

/**
 * Driver class constructor type (Legacy)
 *
 * @deprecated Use factory function pattern instead.
 * Runtime.createDriver() creates drivers directly.
 *
 * @example
 * ```typescript
 * // New pattern - factory function
 * function createClaudeDriver(config, context, sandbox): RuntimeDriver {
 *   // Create driver instance
 * }
 * ```
 */
export interface DriverClass {
  /**
   * Constructor
   */
  new (context: AgentContext): AgentDriver;
}
