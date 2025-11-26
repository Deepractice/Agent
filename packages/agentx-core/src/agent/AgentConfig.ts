/**
 * AgentConfig - Runtime configuration for Agent
 *
 * Like Spring's @Value / application.yml, this provides runtime config.
 * Merged with AgentDefinition to create Agent instance.
 */

/**
 * AgentConfig - Runtime configuration
 */
export interface AgentConfig {
  /**
   * Custom agent ID (optional, auto-generated if not provided)
   */
  agentId?: string;

  /**
   * Model to use (optional, driver default)
   */
  model?: string;

  /**
   * Temperature (optional)
   */
  temperature?: number;

  /**
   * Max tokens (optional)
   */
  maxTokens?: number;

  /**
   * Session ID to associate (optional)
   */
  sessionId?: string;

  /**
   * Additional metadata (optional)
   */
  metadata?: Record<string, unknown>;
}

/**
 * Generate unique agent ID
 */
export function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
