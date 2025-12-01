/**
 * AgentDefinition - Agent template (source level)
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *
 * AgentDefinition is the template created by defineAgent().
 * Contains business-level configuration (what the agent does).
 * Must be built into Image before running as Agent.
 *
 * @example
 * ```typescript
 * const TranslatorDef = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a professional translator",
 * });
 *
 * agentx.definitions.register(TranslatorDef);
 * const image = await agentx.images.build("Translator", config);
 * const agent = agentx.agents.run(image.imageId);
 * ```
 */
export interface AgentDefinition {
  /**
   * Agent name (required, unique identifier for registration)
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
}
