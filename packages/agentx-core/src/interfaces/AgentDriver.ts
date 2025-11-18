/**
 * AgentDriver Interface (SPI - Service Provider Interface)
 *
 * Platform-specific driver that connects to LLM providers and transforms
 * their responses into AgentX Stream events.
 *
 * ## Two Ways to Implement
 *
 * ### 1. Extend BaseAgentDriver (Recommended for most cases)
 *
 * BaseAgentDriver provides:
 * - ✅ Fixed event sequence (message_start → content → message_stop)
 * - ✅ StreamEventBuilder for easy event creation
 * - ✅ Only implement generateContent() - the core logic
 *
 * ```typescript
 * import { BaseAgentDriver } from "@deepractice-ai/agentx-core";
 *
 * class MyDriver extends BaseAgentDriver {
 *   readonly sessionId = "my-session";
 *   readonly driverSessionId = null;
 *
 *   constructor() {
 *     super("my-agent-id");
 *   }
 *
 *   // Only need to implement this!
 *   protected async *generateContent(message: UserMessage) {
 *     yield this.builder.textContentBlockStart(0);
 *     yield this.builder.textDelta("Hello", 0);
 *     yield this.builder.textContentBlockStop(0);
 *   }
 *
 *   abort() {}
 *   async destroy() {}
 * }
 * ```
 *
 * ### 2. Implement AgentDriver directly (Full control)
 *
 * For complex scenarios requiring custom event sequences:
 *
 * ```typescript
 * import { StreamEventBuilder } from "@deepractice-ai/agentx-core";
 *
 * class CustomDriver implements AgentDriver {
 *   private builder = new StreamEventBuilder("agent-id");
 *
 *   async *sendMessage(message: UserMessage) {
 *     yield this.builder.messageStart("msg-1", "model");
 *     // ... custom logic
 *     yield this.builder.messageStop();
 *   }
 * }
 * ```
 *
 * ## Event Sequence Contract
 *
 * All drivers MUST follow this sequence:
 *
 * ```
 * message_start (REQUIRED)
 *   → (content blocks)* (REQUIRED - at least one)
 *       - text_content_block_start
 *       - text_delta (repeated)
 *       - text_content_block_stop
 *     OR
 *       - tool_use_content_block_start
 *       - input_json_delta (repeated)
 *       - tool_use_content_block_stop
 *   → message_delta (OPTIONAL)
 *   → message_stop (REQUIRED)
 * ```
 *
 * ## Multi-Turn Support
 *
 * The driver accepts either:
 * - Single `UserMessage` - for single-turn conversations
 * - `AsyncIterable<UserMessage>` - for multi-turn conversations
 *
 * Override `handleMultiTurn()` in BaseAgentDriver to support conversation flow.
 */

import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";

/**
 * AgentDriver Interface
 *
 * Platform-specific driver for connecting to LLM providers.
 * Returns stream of already-transformed AgentEvents.
 */
export interface AgentDriver {
  /**
   * Logical session ID (assigned by AgentX)
   */
  readonly sessionId: string;

  /**
   * Driver's internal session ID (e.g., Claude SDK session ID)
   * May be null before first message is sent
   */
  readonly driverSessionId: string | null;

  /**
   * Send user message(s) and stream back AgentX Stream events
   *
   * Supports both single-turn and multi-turn conversations:
   * - Single message: `sendMessage(userMessage)`
   * - Multi-turn: `sendMessage(asyncIterableOfMessages)`
   *
   * @param messages - Single UserMessage or AsyncIterable for multi-turn
   * @returns AsyncIterable of Stream events
   *
   * @example Single-turn
   * ```typescript
   * const message: UserMessage = {
   *   id: "msg_1",
   *   role: "user",
   *   content: "Hello",
   *   timestamp: Date.now()
   * };
   *
   * for await (const event of driver.sendMessage(message)) {
   *   if (event.type === "text_delta") {
   *     console.log(event.data.text);
   *   }
   * }
   * ```
   *
   * @example Multi-turn (with BaseAgentDriver)
   * ```typescript
   * async function* conversation() {
   *   yield { role: "user", content: "What is 2+2?" };
   *   // Driver yields tool_use event
   *   // Core executes tool
   *   yield { role: "user", content: "Tool result: 4" };
   * }
   *
   * for await (const event of driver.sendMessage(conversation())) {
   *   console.log(event);
   * }
   * ```
   */
  sendMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): AsyncIterable<StreamEventType>;

  /**
   * Abort the current streaming operation
   *
   * Should cancel any in-flight requests but keep the driver alive.
   * Next sendMessage() call should work normally.
   */
  abort(): void;

  /**
   * Destroy the driver and release all resources
   *
   * After calling destroy(), the driver instance cannot be reused.
   */
  destroy(): Promise<void>;
}
