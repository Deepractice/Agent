/**
 * AgentStateMachine - State management driven by StateEvents
 *
 * Manages agent state transitions driven by StateEvents.
 * Single source of truth for agent state in AgentEngine.
 *
 * Flow:
 * StreamEvent → MealyMachine → StateEvent → AgentStateMachine → state update
 *
 * Responsibilities:
 * - Process StateEvents
 * - Maintain current AgentState
 * - Notify state change subscribers
 */

import type {
  AgentState,
  StateChange,
  StateChangeHandler,
  Unsubscribe,
  AgentOutput,
} from "@agentxjs/types/agent";
import { isStateEvent } from "@agentxjs/types/agent";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("agent/AgentStateMachine");

/**
 * AgentStateMachine implementation
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
   * Process an event and update internal state if it's a StateEvent
   *
   * @param event - Event from MealyMachine (could be any AgentOutput)
   */
  process(event: AgentOutput): void {
    // Only process StateEvents
    if (!isStateEvent(event)) {
      return;
    }

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

    // Notify handlers of reset to idle
    if (prev !== "idle") {
      this.notifyHandlers({ prev, current: "idle" });
    }

    this.handlers.clear();
  }

  /**
   * Map StateEvent type to AgentState
   *
   * @param event - StateEvent from MealyMachine
   * @returns New AgentState or null if no transition needed
   */
  private mapEventToState(event: AgentOutput): AgentState | null {
    switch (event.type) {
      // Conversation lifecycle
      case "conversation_start":
        return "thinking";
      case "conversation_thinking":
        return "thinking";
      case "conversation_responding":
        return "responding";
      case "conversation_end":
        return "idle";
      case "conversation_interrupted":
        return "idle";

      // Tool lifecycle
      case "tool_planned":
        return "planning_tool";
      case "tool_executing":
        return "awaiting_tool_result";
      case "tool_completed":
        return "responding";
      case "tool_failed":
        return "responding";

      // Error
      case "error_occurred":
        return "error";

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
