/**
 * AgentContext utilities
 *
 * Type definitions are in @deepractice-ai/agentx-types.
 * This file contains utility functions for creating AgentContext.
 */

import type { AgentContext } from "@deepractice-ai/agentx-types";

/**
 * Generate unique agent ID
 */
export function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create AgentContext by merging internal fields with config
 *
 * @param config - User-provided configuration
 * @returns Complete AgentContext with internal fields + config
 */
export function createAgentContext<TConfig extends Record<string, unknown>>(
  config: TConfig
): AgentContext<TConfig> {
  return {
    agentId: generateAgentId(),
    createdAt: Date.now(),
    ...config,
  } as AgentContext<TConfig>;
}
