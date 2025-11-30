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
 * Create AgentContext - pure identity
 *
 * AgentContext is now pure identity (agentId + createdAt).
 * Config is separate and passed to Driver.
 *
 * @returns AgentContext with agentId and createdAt
 */
export function createAgentContext(): AgentContext {
  return {
    agentId: generateAgentId(),
    createdAt: Date.now(),
  };
}
