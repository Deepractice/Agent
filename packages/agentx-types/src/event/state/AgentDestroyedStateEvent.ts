/**
 * Agent Destroyed State Event (L2: State Layer)
 *
 * State transition: Ready → Destroyed
 *
 * Emitted when agent instance is being destroyed/cleaned up.
 * Represents the end of agent's lifecycle.
 */

import type { StateEvent } from "./StateEvent";

export interface AgentDestroyedStateEvent extends StateEvent {
  type: "agent_destroyed";

  /**
   * Event data (empty - state transition only)
   */
  data: Record<string, never>;
}
