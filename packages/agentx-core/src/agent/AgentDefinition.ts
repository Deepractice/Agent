/**
 * AgentDefinition - Static definition of an Agent
 *
 * Like Spring's BeanDefinition, this defines WHAT an agent is.
 * Can be persisted to database.
 *
 * Contains:
 * - Identity (name)
 * - Driver (how to communicate with LLM)
 * - System prompt (agent's personality)
 */

import type { Driver } from "@deepractice-ai/agentx-engine";

/**
 * AgentDefinition - Static agent definition
 */
export interface AgentDefinition {
  /**
   * Agent name (identifier)
   */
  name: string;

  /**
   * Driver for LLM communication
   */
  driver: Driver;

  /**
   * System prompt (optional)
   */
  systemPrompt?: string;

  /**
   * Description (optional)
   */
  description?: string;

  /**
   * Version (optional)
   */
  version?: string;
}
