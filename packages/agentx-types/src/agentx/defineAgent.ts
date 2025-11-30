/**
 * defineAgent - Agent definition function
 *
 * "Define Once, Run Anywhere"
 *
 * Creates an AgentDefinition with business-level config.
 * Runtime provides infrastructure (Driver, Sandbox).
 *
 * @example
 * ```typescript
 * import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a professional translator",
 * });
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 * ```
 */

import type { AgentDefinition } from "~/agent/AgentDefinition";

/**
 * Input for defining an agent
 *
 * Same as AgentDefinition - just pass the fields directly.
 */
export interface DefineAgentInput {
  /**
   * Agent name (required)
   */
  name: string;

  /**
   * Agent description (optional)
   */
  description?: string;

  /**
   * System prompt - controls agent behavior
   */
  systemPrompt?: string;

  // Add more fields as needed (same as AgentDefinition)
}

/**
 * defineAgent - Define an agent template
 *
 * @param input - Agent definition input
 * @returns Agent definition
 */
export declare function defineAgent(input: DefineAgentInput): AgentDefinition;
