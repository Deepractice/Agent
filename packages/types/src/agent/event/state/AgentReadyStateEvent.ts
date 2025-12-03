/**
 * Agent Ready State Event (L2: State Layer)
 *
 * State transition: Initializing → Ready
 *
 * Emitted when agent instance is fully initialized and ready to handle conversations.
 * Represents the agent's operational readiness.
 *
 * This event is emitted once per agent instance lifetime.
 *
 * Aligned with: SDKSystemMessage from @anthropic-ai/claude-agent-sdk
 */

import type { StateEvent } from "./StateEvent";

export interface AgentReadyStateEvent extends StateEvent {
  type: "agent_ready";

  /**
   * Event data (agent configuration)
   */
  data: {
    /**
     * LLM model being used
     */
    model: string;

    /**
     * Available tool names
     */
    tools: string[];

    /**
     * Current working directory
     */
    cwd: string;
  };
}
