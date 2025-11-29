/**
 * MockDriver - Simple test driver for BDD tests
 *
 * This driver implements AgentDriver interface and provides:
 * - Echo functionality: repeats user messages back
 * - Error simulation: can be configured to emit errors
 * - Minimal stream events for testing
 */

import type { AgentDriver, AgentContext, DriverClass } from "@deepractice-ai/agentx-types";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-types";

export interface MockDriverConfig {
  /**
   * If true, driver will emit an error event
   */
  shouldError?: boolean;

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Response to echo back (defaults to echoing user message)
   */
  response?: string;

  /**
   * Delay in milliseconds before responding
   */
  delay?: number;
}

/**
 * MockDriver - Test driver that echoes messages
 */
export class MockDriver implements AgentDriver {
  readonly name = "MockDriver";
  readonly description = "Test driver for BDD tests";

  private readonly context: AgentContext<MockDriverConfig>;

  constructor(context: AgentContext<MockDriverConfig>) {
    this.context = context;
  }

  async *receive(message: UserMessage): AsyncIterable<StreamEventType> {
    const config = this.context as MockDriverConfig;
    const agentId = this.context.agentId;

    // Optional delay
    if (config.delay) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    // Emit error if configured
    if (config.shouldError) {
      // Note: Error events are handled by the engine layer, not driver
      // For testing errors, we'll throw an exception
      throw new Error(config.errorMessage || "Mock driver error");
    }

    // Generate message ID
    const messageId = `msg_${Date.now()}`;
    const timestamp = Date.now();

    // Start message
    yield {
      type: "message_start",
      uuid: this.generateUUID(),
      agentId,
      timestamp,
      data: {
        message: {
          id: messageId,
          model: "mock-model-1.0",
        },
      },
    };

    // Determine response text
    const responseText = config.response || this.extractMessageContent(message);

    // Yield text deltas (split into chunks for more realistic streaming)
    const chunks = this.splitIntoChunks(responseText, 10);
    for (const chunk of chunks) {
      yield {
        type: "text_delta",
        uuid: this.generateUUID(),
        agentId,
        timestamp: Date.now(),
        data: {
          text: chunk,
        },
      };
    }

    // Stop message
    yield {
      type: "message_stop",
      uuid: this.generateUUID(),
      agentId,
      timestamp: Date.now(),
      data: {},
    };
  }

  async destroy(): Promise<void> {
    // No cleanup needed for MockDriver
  }

  /**
   * Generate a simple UUID for testing
   */
  private generateUUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract text content from UserMessage
   */
  private extractMessageContent(message: UserMessage): string {
    if (typeof message.content === "string") {
      return `Echo: ${message.content}`;
    }

    // Handle content array
    const textParts = message.content
      .filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text)
      .join(" ");

    return `Echo: ${textParts}`;
  }

  /**
   * Split text into chunks for streaming simulation
   */
  private splitIntoChunks(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize));
    }
    return chunks;
  }

  /**
   * Create a configured driver class with custom options
   */
  static withConfig(extraConfig: Partial<MockDriverConfig>): DriverClass<MockDriverConfig> {
    return class ConfiguredMockDriver extends MockDriver {
      constructor(context: AgentContext<MockDriverConfig>) {
        const mergedContext = {
          ...context,
          ...extraConfig,
        };
        super(mergedContext);
      }
    };
  }
}

/**
 * Create a mock driver class (for backwards compatibility)
 * @deprecated Use MockDriver class directly
 */
export function createMockDriver(): typeof MockDriver {
  return MockDriver;
}
