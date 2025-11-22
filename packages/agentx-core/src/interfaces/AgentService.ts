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

import type { Agent, Message, Session, AgentState } from "@deepractice-ai/agentx-types";
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
   * Get current agent state (read-only)
   *
   * Allows querying the current operational state without subscribing to events.
   *
   * @example
   * ```typescript
   * if (agent.state === "idle") {
   *   await agent.send("Hello!");
   * }
   * ```
   */
  readonly state: AgentState;

  /**
   * Subscribe to state changes
   *
   * Register a callback that will be called whenever the agent state changes.
   * Returns an unsubscribe function.
   *
   * @param callback - Function called with (newState, previousState)
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = agent.onStateChange((state, prevState) => {
   *   console.log(`State changed: ${prevState} -> ${state}`);
   *   if (state === "responding") {
   *     showLoadingIndicator();
   *   } else if (state === "idle") {
   *     hideLoadingIndicator();
   *   }
   * });
   *
   * // Later: stop listening
   * unsubscribe();
   * ```
   */
  onStateChange(callback: (state: AgentState, previousState: AgentState) => void): () => void;

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
   * Register an AgentReactor
   *
   * Registers a reactor with full lifecycle management (initialize/destroy).
   * The reactor will be initialized immediately if the agent is already initialized.
   *
   * @param reactor - AgentReactor to register
   * @returns Unsubscribe function to destroy and remove the reactor
   *
   * @example
   * ```typescript
   * const LoggerReactor = defineReactor({
   *   name: "Logger",
   *   onAssistantMessage: (event) => {
   *     console.log("Assistant:", event.data.content);
   *   }
   * });
   *
   * const unsubscribe = await agent.registerReactor(
   *   LoggerReactor.create()
   * );
   *
   * // Later: unsubscribe to stop the reactor
   * await unsubscribe();
   * ```
   */
  registerReactor(reactor: any): Promise<() => void>;

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
  exportToSession(): Omit<Session, "id">;

  // Note: sendMessage(), abort(), destroy() are inherited from AgentDriver
}
