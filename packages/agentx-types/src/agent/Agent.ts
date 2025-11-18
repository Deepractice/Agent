/**
 * Agent
 *
 * Complete data structure of an AI agent.
 * Pure data, can be serialized and persisted.
 */
export interface Agent {
  /**
   * Agent unique identifier
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
   * When this agent was created
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
   * Examples: userId, teamId, custom properties, etc.
   */
  [key: string]: unknown;
}
