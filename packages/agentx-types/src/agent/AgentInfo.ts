/**
 * AgentInfo
 *
 * Static definition of an AI agent.
 * Pure data structure describing agent identity and capabilities.
 *
 * This represents "WHO am I?" - the agent's identity and metadata.
 * For runtime state ("WHAT am I doing?"), see AgentInstance in agentx-core.
 *
 * Think of it as:
 * - AgentInfo: "I am Claude, a writing assistant created on 2025-01-01"
 * - AgentInstance: "I'm currently in session-456 talking to user-123"
 */
export interface AgentInfo {
  /**
   * Agent unique identifier
   * Identifies the agent type/definition
   */
  id: string;

  /**
   * Agent display name
   */
  name: string;

  /**
   * Agent description
   * Explains what this agent does
   */
  description?: string;

  /**
   * When this agent definition was created
   */
  createdAt: number;

  /**
   * Agent version
   * @example "1.0.0"
   */
  version?: string;

  /**
   * Agent tags for categorization
   * @example ["coding", "review", "debugging"]
   */
  tags?: string[];

  /**
   * Optional metadata for application-layer extensions
   * Examples: teamId, ownerId, custom properties, etc.
   */
  metadata?: Record<string, unknown>;
}
