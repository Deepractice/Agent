/**
 * MockDriver
 *
 * Reference implementation of AgentDriver for testing and demonstration.
 * Shows how to extend BaseAgentDriver with minimal code.
 *
 * Features:
 * - Echoes user messages with character-by-character streaming
 * - Simulates async delay for realistic streaming effect
 * - Clean abort handling
 *
 * @example
 * ```typescript
 * const driver = new MockDriver("test-session", "test-agent");
 * for await (const event of driver.sendMessage(userMessage)) {
 *   console.log(event.type, event.data);
 * }
 * ```
 */

import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import { BaseAgentDriver } from "./BaseAgentDriver";

export class MockDriver extends BaseAgentDriver {
  readonly sessionId: string;
  readonly driverSessionId = "mock-driver-session";

  private aborted = false;
  protected customResponses: Map<string, string> = new Map();
  protected defaultResponse?: string;

  constructor(sessionId: string, agentId: string = "mock-agent") {
    super(agentId);
    this.sessionId = sessionId;
  }

  /**
   * Set a custom response for a specific user message
   */
  setCustomResponse(userMessage: string, response: string): void {
    this.customResponses.set(userMessage, response);
  }

  /**
   * Set a default response for all messages
   */
  setDefaultResponse(response: string): void {
    this.defaultResponse = response;
  }

  /**
   * Core content generation - only method we need to implement!
   *
   * Echoes user message with character-by-character streaming.
   */
  protected async *generateContent(
    message: UserMessage
  ): AsyncIterable<StreamEventType> {
    this.aborted = false;

    // Extract text from message
    const text =
      typeof message.content === "string"
        ? message.content
        : message.content.map((p) => ("text" in p ? p.text : "")).join("");

    // Determine response: custom, default, or echo
    let response: string;
    if (this.customResponses.has(text)) {
      response = this.customResponses.get(text)!;
    } else if (this.defaultResponse) {
      response = this.defaultResponse;
    } else {
      response = `You said: ${text}`;
    }

    // Start text block
    yield this.builder.textContentBlockStart(0);

    // Stream character by character
    for (const char of response) {
      if (this.aborted) {
        break; // Stop if aborted
      }

      yield this.builder.textDelta(char, 0);

      // Simulate async delay (10ms per character)
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Stop text block
    yield this.builder.textContentBlockStop(0);
  }

  /**
   * Override model name
   */
  protected async getModel(_message: UserMessage): Promise<string> {
    return "mock-model-v1";
  }

  /**
   * Abort current streaming
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.aborted = true;
    // No resources to clean up in mock
  }
}
