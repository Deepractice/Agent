/**
 * AgentDriver - Stateless Driver interface
 *
 * AgentDriver is a STATELESS driver that receives user messages
 * along with an AgentContext containing all configuration.
 *
 * Key Design:
 * - Driver has NO internal state
 * - All config comes from context
 * - Same driver instance can serve multiple agents
 * - Enables distributed architecture
 *
 * @example
 * ```typescript
 * const claudeDriver: AgentDriver = {
 *   name: "ClaudeDriver",
 *   description: "Claude AI SDK integration",
 *
 *   async *receive(message, context) {
 *     const client = new Anthropic({ apiKey: context.apiKey });
 *     const stream = client.messages.stream({
 *       model: context.model || "claude-sonnet-4-20250514",
 *       messages: [{ role: "user", content: message.content }],
 *     });
 *
 *     for await (const chunk of stream) {
 *       yield transformToStreamEvent(chunk);
 *     }
 *   },
 * };
 * ```
 */

import type { StreamEventType } from "~/event";
import type { UserMessage } from "~/message";
import type { AgentContext } from "./AgentContext";

/**
 * AgentDriver interface
 *
 * A named, stateless driver that receives user messages with context
 * and yields stream events.
 */
export interface AgentDriver<TConfig = Record<string, unknown>> {
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
   * Driver is STATELESS - all configuration comes from context.
   *
   * @param message - User message to process
   * @param context - Agent context containing agentId, createdAt, and all config fields
   * @returns AsyncIterable of stream events
   */
  receive(message: UserMessage, context: AgentContext<TConfig>): AsyncIterable<StreamEventType>;
}
