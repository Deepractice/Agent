/**
 * MockProvider
 *
 * Mock implementation of AgentProvider for testing.
 * Simulates Claude API responses without making real network calls.
 */

import type { AgentProvider } from "@deepractice-ai/agentx-core";
import type { AgentConfig, AgentEvent } from "@deepractice-ai/agentx-api";
import { AgentConfigError } from "@deepractice-ai/agentx-api";
import type { Message } from "@deepractice-ai/agentx-types";

export interface MockProviderOptions {
  /** Simulate API delay in ms */
  delay?: number;
  /** Simulate error */
  simulateError?: boolean;
  /** Error type to simulate */
  errorType?: "network" | "api" | "max_turns" | "execution";
  /** Custom response */
  customResponse?: string;
  /** Simulate streaming with multiple chunks */
  streamChunks?: string[];
}

export class MockProvider implements AgentProvider {
  readonly sessionId: string;
  private aborted = false;
  private options: MockProviderOptions;
  private config: AgentConfig;

  constructor(config: AgentConfig, options: MockProviderOptions = {}) {
    this.config = config;
    this.options = options;
    this.sessionId = this.generateSessionId();
  }

  async *send(
    message: string,
    messages: ReadonlyArray<Message>
  ): AsyncGenerator<AgentEvent> {
    this.aborted = false;

    // Simulate delay
    if (this.options.delay) {
      await this.sleep(this.options.delay);
    }

    // Check if aborted
    if (this.aborted) {
      throw new Error("Operation aborted");
    }

    const uuid = this.generateUuid();
    const timestamp = Date.now();

    // Emit system init event (first time only)
    yield {
      type: "system",
      subtype: "init",
      uuid,
      sessionId: this.sessionId,
      model: this.config.model,
      tools: [],
      cwd: process.cwd(),
      timestamp,
    };

    // Simulate error if configured
    if (this.options.simulateError) {
      yield this.createErrorEvent(uuid, timestamp);
      return;
    }

    // Emit user message event
    yield {
      type: "user",
      uuid,
      sessionId: this.sessionId,
      message: {
        id: uuid,
        role: "user",
        content: message,
        timestamp,
      },
      timestamp,
    };

    // Simulate streaming response
    const chunks = this.options.streamChunks || [
      "Hello! ",
      "I'm a ",
      "mock assistant. ",
      "You said: ",
      message,
    ];

    for (const chunk of chunks) {
      if (this.aborted) {
        throw new Error("Operation aborted");
      }

      yield {
        type: "stream_event",
        uuid: this.generateUuid(),
        sessionId: this.sessionId,
        streamEventType: "content_block_delta",
        delta: {
          type: "text_delta",
          text: chunk,
        },
        timestamp: Date.now(),
      };

      // Small delay between chunks
      await this.sleep(10);
    }

    // Build full response with context awareness
    let fullResponse = this.options.customResponse || chunks.join("");

    // Simple context-aware responses for testing
    if (!this.options.customResponse) {
      // Check if asking about name
      if (message.toLowerCase().includes("my name") || message.toLowerCase().includes("what's my name")) {
        // Look for name in previous messages
        const nameMatch = messages.find(m =>
          m.role === "user" && m.content.toLowerCase().includes("my name is")
        );
        if (nameMatch) {
          const match = nameMatch.content.match(/my name is (\w+)/i);
          if (match) {
            fullResponse = `Your name is ${match[1]}.`;
          }
        }
      }
    }

    // Emit assistant message
    yield {
      type: "assistant",
      uuid: this.generateUuid(),
      sessionId: this.sessionId,
      message: {
        id: this.generateUuid(),
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    // Emit result event (success)
    yield {
      type: "result",
      subtype: "success",
      uuid: this.generateUuid(),
      sessionId: this.sessionId,
      durationMs: this.options.delay || 100,
      durationApiMs: (this.options.delay || 100) - 10,
      numTurns: 1,
      result: fullResponse,
      totalCostUsd: 0.001,
      usage: {
        input: message.length,
        output: fullResponse.length,
        cacheRead: 0,
        cacheWrite: 0,
      },
      timestamp: Date.now(),
    };
  }

  validateConfig(config: AgentConfig): void {
    if (!config.apiKey) {
      throw new AgentConfigError("apiKey is required", "apiKey");
    }
    if (!config.model) {
      throw new AgentConfigError("model is required", "model");
    }
  }

  abort(): void {
    this.aborted = true;
  }

  async destroy(): Promise<void> {
    this.abort();
  }

  private createErrorEvent(uuid: string, timestamp: number): AgentEvent {
    const errorType = this.options.errorType || "execution";

    const baseEvent = {
      uuid,
      sessionId: this.sessionId,
      durationMs: 100,
      durationApiMs: 90,
      numTurns: 1,
      totalCostUsd: 0,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      },
      timestamp,
    };

    if (errorType === "max_turns") {
      return {
        type: "result",
        subtype: "error_max_turns",
        ...baseEvent,
        error: new Error("Maximum conversation turns reached"),
      };
    }

    return {
      type: "result",
      subtype: "error_during_execution",
      ...baseEvent,
      error: new Error(`Simulated ${errorType} error`),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateSessionId(): string {
    return `mock_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateUuid(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
