/**
 * Session - Conversation context
 *
 * Represents a conversation session for an agent.
 * Sessions can persist across multiple message exchanges.
 */

/**
 * Session represents a conversation context
 */
export interface Session {
  /**
   * Unique session identifier
   */
  readonly sessionId: string;

  /**
   * Associated agent ID
   */
  readonly agentId: string;

  /**
   * Session creation timestamp
   */
  readonly createdAt: number;
}
