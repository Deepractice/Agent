/**
 * Agent Event (Base)
 *
 * Foundation for all events in the AgentX event system.
 * Every event, regardless of layer, extends this base.
 *
 * An Agent represents a stateful LLM instance with its own context.
 * Different contexts = different Agents.
 */

export interface AgentEvent {
  /**
   * Unique event identifier (UUID)
   */
  uuid: string;

  /**
   * Agent instance identifier
   * Each Agent is a stateful LLM instance with its own conversation context
   */
  agentId: string;

  /**
   * Unix timestamp (milliseconds) when event was created
   */
  timestamp: number;
}
