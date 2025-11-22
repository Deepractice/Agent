/**
 * AgentInstance - Agent runtime instance interface
 *
 * Represents a running Agent instance with complete runtime state and metadata.
 * This is a runtime concept (Core layer), not a static type definition.
 *
 * Extends AgentInfo to include static information (WHO am I?).
 * Extends AgentDriver to support Agent-as-Driver pattern.
 * Adds runtime state management (WHAT am I doing?).
 *
 * @example
 * ```typescript
 * // AgentService implements AgentInstance
 * const instance: AgentInstance = await registry.createAgent(...);
 *
 * // Access static info (from AgentInfo)
 * console.log(instance.id, instance.name);
 *
 * // Access runtime state
 * console.log(instance.sessionId, instance.state);
 *
 * // Call methods
 * await instance.queue("Hello");
 * ```
 */

import type { AgentInfo, Message, UserMessage, AgentState } from "@deepractice-ai/agentx-types";
import type { AgentDriver } from "@deepractice-ai/agentx-engine";
import type { AgentContext } from "@deepractice-ai/agentx-engine";
import type { AgentReactor } from "@deepractice-ai/agentx-engine";
import type { Unsubscribe } from "@deepractice-ai/agentx-event";

/**
 * Turn statistics
 */
export interface TurnStats {
  totalTurns: number;
  totalTokens: number;
  totalCost: number;
}

/**
 * Event handlers for react() method
 */
export interface EventHandlers {
  onTextDelta?: (event: any) => void;
  onAssistantMessage?: (event: any) => void;
  onToolUseMessage?: (event: any) => void;
  onErrorMessage?: (event: any) => void;
  onConversationActive?: (event: any) => void;
  onTurnComplete?: (event: any) => void;
  // Add more as needed
}

/**
 * AgentInstance summary info (for queries)
 */
export interface AgentInstanceInfo extends AgentInfo {
  sessionId: string | null;
  driverSessionId: string | null;
  state: AgentState;
  instanceCreatedAt: Date;
  lastActivityAt: Date;
  initialized: boolean;
  destroyed: boolean;
  messageCount: number;
  turnStats: Readonly<TurnStats>;
}

/**
 * AgentInstance - Complete runtime instance interface
 *
 * Extends AgentInfo (static information)
 * Extends AgentDriver (driver interface for Agent-as-Driver pattern)
 */
export interface AgentInstance extends AgentInfo, AgentDriver {
  // ===== Inherited from AgentInfo =====
  // id: string
  // name: string
  // description?: string
  // createdAt: number  (definition creation time)
  // version?: string
  // tags?: string[]
  // metadata?: Record<string, unknown>

  // ===== Inherited from AgentDriver =====
  // readonly driverSessionId: string | null
  // processMessage(messages): AsyncIterable<StreamEventType>
  // abort(): void
  // destroy(): Promise<void>

  // ===== Session identification =====
  /**
   * Framework Session ID
   * Assigned by AgentRegistry
   */
  sessionId: string | null;

  // ===== Runtime state =====
  /**
   * Current agent state
   */
  state: AgentState;

  /**
   * Runtime context
   */
  context: AgentContext;

  // ===== Lifecycle information =====
  /**
   * Instance creation time (not definition creation time)
   */
  instanceCreatedAt: Date;

  /**
   * Last activity time
   */
  lastActivityAt: Date;

  /**
   * Initialization status
   */
  initialized: boolean;

  /**
   * Destruction status
   */
  destroyed: boolean;

  // ===== Business data =====
  /**
   * Message history (read-only)
   */
  readonly messages: ReadonlyArray<Message>;

  /**
   * Turn statistics (read-only)
   */
  readonly turnStats: Readonly<TurnStats>;

  // ===== User API methods =====
  /**
   * Send message (queue for execution)
   */
  queue(message: string | UserMessage): Promise<void>;

  /**
   * Send message (wait for completion)
   */
  send(message: string | UserMessage): Promise<void>;

  /**
   * Initialize the agent
   */
  initialize(): Promise<void>;

  /**
   * Register a reactor
   */
  registerReactor(reactor: AgentReactor): Promise<Unsubscribe>;

  /**
   * Register event handlers (simplified API)
   */
  react(handlers: EventHandlers): Unsubscribe;

  /**
   * Clear message history
   */
  clearMessages(): void;

  // ===== Metadata management =====
  /**
   * Update turn statistics
   */
  updateStats(stats: Partial<TurnStats>): void;

  /**
   * Update last activity time
   */
  updateLastActivity(): void;

  /**
   * Get instance summary information
   */
  getInstanceInfo(): AgentInstanceInfo;
}
