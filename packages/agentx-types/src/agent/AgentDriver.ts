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
import type { ConfigSchema } from "~/config";

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
   * Destroy the driver and cleanup resources
   *
   * Called when the Agent is destroyed.
   */
  destroy(): Promise<void>;
}

/**
 * Driver class constructor type
 *
 * Used in AgentDefinition to specify which Driver class to instantiate.
 *
 * @example
 * ```typescript
 * // Basic usage - pass the class directly
 * defineAgent({
 *   name: "MyAgent",
 *   driver: ClaudeDriver,
 * });
 *
 * // With schema - driver declares its config structure
 * class ClaudeDriver implements AgentDriver {
 *   static schema = {
 *     systemPrompt: { type: "string", scope: "definition" },
 *     apiKey: { type: "string", scope: "instance", required: true },
 *     // ...
 *   } as const satisfies ConfigSchema;
 * }
 * ```
 */
export interface DriverClass<TConfig = Record<string, unknown>> {
  /**
   * Constructor
   */
  new (context: AgentContext<TConfig>): AgentDriver;

  /**
   * Optional configuration schema
   *
   * If provided, enables type-safe config in defineAgent and create.
   * The schema declares what configuration the driver accepts.
   */
  schema?: ConfigSchema;
}
