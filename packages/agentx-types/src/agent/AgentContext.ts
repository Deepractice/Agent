/**
 * AgentContext - Runtime context for Agent
 *
 * Pure identity context, separated from config.
 * Config is passed independently to Driver.
 */

/**
 * AgentContext - Agent identity context
 *
 * Contains only identity fields, no config.
 * Driver receives (config, context, sandbox) separately.
 */
export interface AgentContext {
  /**
   * Unique agent instance ID
   */
  readonly agentId: string;

  /**
   * Creation timestamp (milliseconds)
   */
  readonly createdAt: number;
}
