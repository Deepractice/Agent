/**
 * Agent - Runtime instance interface
 *
 * Defines the contract for an Agent instance.
 * Implementation is in core (AgentInstance).
 *
 * Lifecycle:
 * - running: Active, can receive messages
 * - destroyed: Removed from memory, cannot be used
 *
 * API:
 * - receive(message): Send message to agent
 * - on(handler): Subscribe to all events
 * - on(type, handler): Subscribe to specific event type
 * - on(types, handler): Subscribe to multiple event types
 * - abort(): System/error forced stop
 * - interrupt(): User-initiated stop
 * - destroy(): Clean up resources
 */

import type { UserMessage } from "~/message";
import type { AgentState } from "~/AgentState";
import type { AgentDefinition } from "./AgentDefinition";
import type { AgentContext } from "./AgentContext";
import type { AgentLifecycle } from "./AgentLifecycle";
import type { AgentEventHandler, Unsubscribe } from "./AgentEventHandler";
import type { AgentEventType } from "~/event/base";

/**
 * Event type name (string literal union)
 * e.g., "message_start" | "text_delta" | ...
 */
type EventTypeName = AgentEventType["type"];

/**
 * Agent interface - Runtime instance contract
 */
export interface Agent {
  /**
   * Unique agent instance ID
   */
  readonly agentId: string;

  /**
   * Agent definition (static config)
   */
  readonly definition: AgentDefinition;

  /**
   * Agent context (runtime config)
   */
  readonly context: AgentContext;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Current lifecycle state
   */
  readonly lifecycle: AgentLifecycle;

  /**
   * Current conversation state
   */
  readonly state: AgentState;

  /**
   * Receive a message from user
   *
   * @param message - String content or UserMessage object
   */
  receive(message: string | UserMessage): Promise<void>;

  /**
   * Subscribe to all events
   */
  on(handler: AgentEventHandler): Unsubscribe;

  /**
   * Subscribe to specific event type by name
   */
  on(type: EventTypeName, handler: AgentEventHandler): Unsubscribe;

  /**
   * Subscribe to multiple event types by name
   */
  on(types: EventTypeName[], handler: AgentEventHandler): Unsubscribe;

  /**
   * Abort - System/error forced stop
   */
  abort(): void;

  /**
   * Interrupt - User-initiated stop
   */
  interrupt(): void;

  /**
   * Destroy - Clean up resources
   */
  destroy(): Promise<void>;
}
