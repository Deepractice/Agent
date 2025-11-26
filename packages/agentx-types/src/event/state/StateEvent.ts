/**
 * State Event (L2: State Layer - Base)
 *
 * Base class for all state transition events.
 * Provides state machine capabilities by tracking state transitions.
 *
 * State transitions form a chain:
 * State A → State B → State C
 *
 * Each StateEvent knows:
 * - What state we're entering (via event type)
 * - What state we came from (via previousState)
 * - When the transition happened (via timestamp)
 */

import type { AgentEvent } from "../base/AgentEvent";

/**
 * StateEvent
 *
 * Base for all state events in L2 layer.
 * Enables state machine tracking and debugging.
 */
export interface StateEvent extends AgentEvent {
  /**
   * Previous state before this transition
   * Null if this is the initial state
   */
  previousState?: string;

  /**
   * Metadata about the state transition
   */
  transition?: {
    /**
     * Reason for state transition
     */
    reason?: string;

    /**
     * Duration in previous state (milliseconds)
     */
    durationMs?: number;

    /**
     * Transition trigger (user action, system event, etc.)
     */
    trigger?: string;
  };
}
