/**
 * Agent Initializing State Event (L2: State Layer)
 *
 * State transition: NotInitialized → Initializing
 *
 * Emitted when agent instance begins initialization process.
 * Represents the start of agent setup (loading config, connecting to services, etc.).
 */

import type { StateEvent } from "./StateEvent";

export interface AgentInitializingStateEvent extends StateEvent {
  type: "agent_initializing";

  /**
   * Event data (empty - state transition only)
   */
  data: Record<string, never>;
}
