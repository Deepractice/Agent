/**
 * Environment - External world that the Agent perceives
 *
 * From systems theory:
 * - Environment is everything outside the system boundary
 * - The system (Agent) perceives the environment through Receptors
 * - The system acts upon the environment through Effectors
 *
 * Environment is NOT just an event filter - it converts external information
 * (which may not be events) into EnvironmentEvents that the system cares about.
 *
 * Analogy: Reading a newspaper, you only read news you care about.
 *
 * Different Environment implementations:
 * - ClaudeEnvironment: Perceives Claude SDK, emits text_chunk, tool_call, etc.
 * - WebSocketEnvironment: Perceives WebSocket messages, emits same event types
 * - MockEnvironment: For testing
 *
 * @see issues/027-systems-theory-agent-environment.md
 * @see issues/028-reactor-pattern-systembus-architecture.md
 */

import type { EnvironmentEvent } from "./event/EnvironmentEvent";
import type { UserMessage } from "./runtime/agent/message";

/**
 * Environment - Interface for external world perception
 */
export interface Environment {
  /**
   * Environment type identifier
   * Examples: "claude", "websocket", "mock"
   */
  readonly type: string;

  /**
   * Start perceiving the environment
   *
   * The environment will call emit() for each EnvironmentEvent it perceives.
   * This converts external information into events the system cares about.
   *
   * @param emit - Function to emit EnvironmentEvents
   */
  start(emit: (event: EnvironmentEvent) => void): void;

  /**
   * Stop perceiving and clean up resources
   */
  stop(): void;

  /**
   * Send a message to the environment (input)
   *
   * For ClaudeEnvironment: triggers a new LLM request
   * For WebSocketEnvironment: sends message to remote server
   *
   * @param message - User message to send
   */
  send(message: UserMessage): Promise<void>;

  /**
   * Interrupt current operation
   *
   * Gracefully stops the current activity (e.g., LLM streaming).
   * Will emit an 'interrupted' EnvironmentEvent.
   */
  interrupt(): void;
}
