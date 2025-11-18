/**
 * DriverBuilder
 *
 * High-level builder for creating AgentDrivers with simplified API.
 * Handles event sequence automatically.
 *
 * @example
 * ```typescript
 * const driver = createDriver({
 *   sessionId: "my-session",
 *
 *   async *generate(message, builder) {
 *     // Automatically yields complete event sequences
 *     yield* builder.text("Hello world");
 *     yield* builder.tool("calculator", { operation: "add", a: 1, b: 2 });
 *     yield* builder.thinking("Let me analyze...");
 *   }
 * });
 * ```
 */

import type { AgentDriver } from "~/interfaces/AgentDriver";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import { StreamEventBuilder } from "~/utils/StreamEventBuilder";

/**
 * High-level content builder
 *
 * Provides simple methods that automatically yield complete event sequences.
 */
export class ContentBuilder {
  private blockIndex = 0;

  constructor(private eventBuilder: StreamEventBuilder) {}

  /**
   * Transform text content to stream events
   *
   * Automatically yields:
   * - text_content_block_start
   * - text_delta
   * - text_content_block_stop
   */
  async *text(content: string): AsyncIterable<StreamEventType> {
    const index = this.blockIndex++;
    yield this.eventBuilder.textContentBlockStart(index);
    yield this.eventBuilder.textDelta(content, index);
    yield this.eventBuilder.textContentBlockStop(index);
  }

  /**
   * Transform thinking content to stream events
   *
   * Note: Currently treated as text. May have dedicated event type in future.
   */
  async *thinking(reasoning: string): AsyncIterable<StreamEventType> {
    yield* this.text(reasoning);
  }

  /**
   * Transform tool call to stream events
   *
   * Automatically yields:
   * - tool_use_content_block_start
   * - input_json_delta
   * - tool_use_content_block_stop
   * - tool_call (high-level event)
   */
  async *tool(name: string, input: Record<string, unknown>): AsyncIterable<StreamEventType> {
    const index = this.blockIndex++;
    const toolId = `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    yield this.eventBuilder.toolUseContentBlockStart(toolId, name, index);
    yield this.eventBuilder.inputJsonDelta(JSON.stringify(input), index);
    yield this.eventBuilder.toolUseContentBlockStop(toolId, index);
    yield this.eventBuilder.toolCall(toolId, name, input);
  }

  /**
   * Reset block index (called internally between messages)
   */
  reset(): void {
    this.blockIndex = 0;
  }
}

/**
 * Configuration for createDriver
 */
export interface DriverConfig {
  /**
   * Session ID
   */
  sessionId?: string;

  /**
   * Generator function that produces content using ContentBuilder
   *
   * @param message - User message to respond to
   * @param builder - High-level content builder
   * @returns Stream of AgentX events
   */
  generate: (
    message: UserMessage,
    builder: ContentBuilder
  ) => AsyncIterable<StreamEventType>;
}

/**
 * Create a simple driver using builder pattern
 *
 * @param config - Driver configuration
 * @returns AgentDriver implementation
 *
 * @example
 * ```typescript
 * const driver = createDriver({
 *   sessionId: "my-session",
 *
 *   async *generate(message, builder) {
 *     // Extract text from message
 *     const text = typeof message.content === "string"
 *       ? message.content
 *       : "Hello";
 *
 *     // Generate response using builder
 *     yield* builder.text(`You said: ${text}`);
 *     yield* builder.tool("echo", { message: text });
 *   }
 * });
 *
 * // Use with createAgent
 * const agent = createAgent("my-agent", driver);
 * ```
 */
export function createDriver(config: DriverConfig): AgentDriver {
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const sessionId = config.sessionId || agentId;

  // Internal state
  let aborted = false;

  return {
    sessionId,
    driverSessionId: null,

    async *sendMessage(messages: UserMessage | AsyncIterable<UserMessage>): AsyncIterable<StreamEventType> {
      // Normalize to iterable
      const messageIterable = Symbol.asyncIterator in Object(messages)
        ? (messages as AsyncIterable<UserMessage>)
        : (async function* () { yield messages as UserMessage; })();

      // Create builders
      const eventBuilder = new StreamEventBuilder(agentId);
      const contentBuilder = new ContentBuilder(eventBuilder);

      // Process each message
      for await (const message of messageIterable) {
        if (aborted) break;

        // Reset content builder for new message
        contentBuilder.reset();

        // Generate message ID
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Yield message_start
        yield eventBuilder.messageStart(messageId, "custom-driver");

        try {
          // Yield content from user's generator
          yield* config.generate(message, contentBuilder);

          // Yield message_stop
          yield eventBuilder.messageStop();
        } catch (error) {
          // On error, still close the message properly
          yield eventBuilder.messageStop();
          throw error;
        }
      }
    },

    abort(): void {
      aborted = true;
    },

    async destroy(): Promise<void> {
      aborted = false;
    },
  };
}
