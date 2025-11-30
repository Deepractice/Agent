/**
 * AgentConfig - Instance-level configuration
 *
 * Passed to agentx.agents.create() when creating an agent instance.
 * Currently empty, add fields as needed.
 *
 * AgentDefinition = what the agent is (template)
 * AgentConfig = instance-level overrides (currently empty)
 * RuntimeConfig = infrastructure config (collected by Runtime)
 *
 * @example
 * ```typescript
 * const agent = agentx.agents.create(MyAgent);  // No config needed yet
 *
 * // Future: when we need instance-level config
 * const agent = agentx.agents.create(MyAgent, {
 *   // AgentConfig fields here
 * });
 * ```
 */

/**
 * AgentConfig - Instance-level configuration
 *
 * Empty for now, add fields as needed.
 */
export interface AgentConfig {
  // Add fields as needed
}
