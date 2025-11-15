/**
 * AgentProvider Interface (SPI - Service Provider Interface)
 *
 * Platform-specific implementation interface for Agent.
 * Different platforms (Node.js, Browser) implement this interface differently.
 *
 * Provider's responsibility: Adapt external SDKs/protocols to our AgentEvent standard.
 *
 * Examples:
 * - ClaudeProvider (Node.js): Adapts @anthropic-ai/claude-agent-sdk → AgentEvent
 * - WebSocketProvider (Browser): Receives AgentEvent from WebSocket server
 * - MockProvider (Testing): Generates mock AgentEvent for testing
 *
 * Key principle: Provider must understand and produce AgentEvent,
 * NOT the other way around. We define the standard, providers adapt to it.
 */

import type { Message } from "@deepractice-ai/agentx-types";
import type { AgentConfig, AgentEvent } from "@deepractice-ai/agentx-api";

/**
 * AgentProvider interface
 *
 * Platform-specific implementation must implement this interface.
 * Provider is responsible for transforming external SDK events into AgentEvent.
 */
export interface AgentProvider {
  /**
   * Session ID for this provider instance
   */
  readonly sessionId: string;

  /**
   * Send a message and stream responses
   *
   * Provider must yield AgentEvent types (our standard).
   * It's the provider's job to adapt external SDK events to AgentEvent.
   *
   * @param message - User message to send
   * @param messages - Full conversation history (for context)
   * @returns AsyncGenerator that yields AgentEvent (our standard)
   *
   * @example
   * ```typescript
   * // ClaudeProvider implementation
   * async *send(message: string, messages: Message[]): AsyncGenerator<AgentEvent> {
   *   const query = claudeSdk.query({ prompt: message });
   *   for await (const sdkMsg of query) {
   *     // Adapt Claude SDK message to our AgentEvent
   *     yield this.adaptToAgentEvent(sdkMsg);
   *   }
   * }
   * ```
   */
  send(message: string, messages: ReadonlyArray<Message>): AsyncGenerator<AgentEvent>;

  /**
   * Validate configuration
   * Throws if configuration is invalid
   *
   * @param config - Agent configuration to validate
   */
  validateConfig(config: AgentConfig): void;

  /**
   * Abort current operation
   */
  abort(): void;

  /**
   * Destroy provider and clean up resources
   */
  destroy(): Promise<void>;
}
