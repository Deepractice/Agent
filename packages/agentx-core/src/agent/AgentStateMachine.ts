/**
 * AgentStateMachine
 *
 * Manages agent state transitions driven by StateEvents.
 * Single source of truth for agent state in Core layer.
 *
 * Flow:
 * StreamEvent → Engine (stateMachineProcessor) → StateEvent → AgentStateMachine
 *
 * Responsibilities:
 * - Listen to StateEvents
 * - Maintain current state
 * - Notify state change subscribers
 */

import type { AgentState, StateEventType, Unsubscribe } from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("core/AgentStateMachine");

/**
 * State change event payload
 */
export interface StateChange {
  prev: AgentState;
  current: AgentState;
}

/**
 * State change handler type
 */
export type StateChangeHandler = (change: StateChange) => void;

/**
 * AgentStateMachine - State management driven by StateEvents
 */
export class AgentStateMachine {
  private _state: AgentState = "idle";
  private readonly handlers = new Set<StateChangeHandler>();

  /**
   * Current agent state
   */
  get state(): AgentState {
    return this._state;
  }

  /**
   * Process a StateEvent and update internal state
   *
   * @param event - StateEvent from Engine layer
   */
  process(event: StateEventType): void {
    const prev = this._state;
    const next = this.mapEventToState(event);

    if (next !== null && prev !== next) {
      this._state = next;
      logger.debug("State transition", {
        eventType: event.type,
        from: prev,
        to: next,
      });
      this.notifyHandlers({ prev, current: next });
    }
  }

  /**
   * Subscribe to state changes
   *
   * @param handler - Callback receiving { prev, current } state change
   * @returns Unsubscribe function
   */
  onStateChange(handler: StateChangeHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Reset state machine (used on destroy)
   */
  reset(): void {
    const prev = this._state;
    this._state = "idle";
    this.handlers.clear();

    // Don't notify on reset - agent is being destroyed
    if (prev !== "idle") {
      // Optionally could notify with a special "destroyed" transition
    }
  }

  /**
   * Map StateEvent type to AgentState
   *
   * @param event - StateEvent from Engine
   * @returns New AgentState or null if no transition needed
   */
  private mapEventToState(event: StateEventType): AgentState | null {
    switch (event.type) {
      // Agent lifecycle
      case "agent_initializing":
        return "initializing";
      case "agent_ready":
        return "idle";
      case "agent_destroyed":
        return "idle";

      // Conversation lifecycle
      case "conversation_queued":
        return "queued";
      case "conversation_start":
        return "conversation_active";
      case "conversation_thinking":
        return "thinking";
      case "conversation_responding":
        return "responding";
      case "conversation_end":
        return "idle";

      // Tool lifecycle
      case "tool_planned":
        return "planning_tool";
      case "tool_executing":
        return "awaiting_tool_result";
      case "tool_completed":
        return "responding"; // Back to responding after tool completes
      case "tool_failed":
        return "responding"; // Continue responding after tool failure

      // Error
      case "error_occurred":
        return "idle"; // Reset to idle on error

      default:
        // Unknown event type, no state change
        return null;
    }
  }

  /**
   * Notify all registered handlers of state change
   */
  private notifyHandlers(change: StateChange): void {
    for (const handler of this.handlers) {
      try {
        handler(change);
      } catch (error) {
        logger.error("State change handler error", {
          from: change.prev,
          to: change.current,
          error,
        });
      }
    }
  }
}
