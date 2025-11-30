/**
 * AgentDefinition - Static definition of an Agent
 *
 * "Define Once, Run Anywhere"
 *
 * AgentDefinition is the template created by defineAgent().
 * Contains business-level configuration (what the agent does).
 * Runtime provides infrastructure (how to run it).
 *
 * @example
 * ```typescript
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a professional translator",
 * });
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 * ```
 */
export interface AgentDefinition {
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

  // Add more fields as needed
}
