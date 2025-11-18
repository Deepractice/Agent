/**
 * AgentService Interface
 *
 * User-facing API for interacting with an Agent instance.
 * Provides methods for sending messages, reacting to events, and managing the agent lifecycle.
 *
 * This interface defines the contract for agent runtime behavior.
 * The default implementation is AgentServiceImpl.
 *
 * **Agent as Driver Pattern**:
 * AgentService extends AgentDriver, which means any Agent can be used as a Driver
 * in nested Agent compositions. This allows building hierarchical agent systems.
 */

import type { Agent, Message, Session } from "@deepractice-ai/agentx-types";
import type { AgentDriver } from "./AgentDriver";

/**
 * AgentService
 *
 * Core agent runtime interface with user-facing API.
 *
 * Extends AgentDriver to enable Agent-as-Driver pattern for nested compositions.
 */
export interface AgentService extends AgentDriver {
  /**
   * Agent unique identifier
   */
  readonly id: string;

  /**
   * Get Agent data (read-only)
   */
  readonly agent: Readonly<Agent>;

  /**
   * Get message history (read-only)
   */
  readonly messages: ReadonlyArray<Message>;

  /**
   * Initialize agent and start event pipeline
   *
   * Must be called before using send() or react()
   *
   * @example
   * ```typescript
   * await agent.initialize();
   * ```
   */
  initialize(): Promise<void>;

  /**
   * Send a text message to the agent
   *
   * @param message - Text message to send
   *
   * @example
   * ```typescript
   * await agent.send("Hello!");
   * ```
   */
  send(message: string): Promise<void>;

  /**
   * Register event handlers using method naming convention
   *
   * Automatically discovers all handler methods (starting with "on") and binds them
   * to corresponding event types.
   *
   * Method naming convention:
   * - onTextDelta → subscribes to "text_delta" event
   * - onMessageStop → subscribes to "message_stop" event
   * - onUserMessage → subscribes to "user_message" event
   * - onAssistantMessage → subscribes to "assistant_message" event
   *
   * @param handlers - An object with event handler methods
   * @returns Unsubscribe function to remove all handlers
   *
   * @example
   * ```typescript
   * agent.react({
   *   onAssistantMessage(event) {
   *     console.log("Assistant:", event.data.content);
   *   },
   *   onUserMessage(event) {
   *     console.log("User:", event.data.content);
   *   },
   * });
   * ```
   */
  react(handlers: Record<string, any>): () => void;

  /**
   * Clear message history and abort current operation
   */
  clear(): void;

  /**
   * Export current state to Session format
   *
   * Used for saving/persisting conversation state.
   *
   * @returns Session data without id (caller should generate id)
   *
   * @example
   * ```typescript
   * const sessionData = agent.exportToSession();
   * const session: Session = {
   *   id: generateId(),
   *   ...sessionData
   * };
   * await saveSession(session);
   * ```
   */
  exportToSession(): Omit<Session, 'id'>;

  // Note: sendMessage(), abort(), destroy() are inherited from AgentDriver
}
