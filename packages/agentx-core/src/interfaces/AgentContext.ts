/**
 * AgentContext
 *
 * Runtime context for an agent instance.
 * Captures the execution state and environment of a running agent.
 *
 * Separation of concerns:
 * - **Agent** (agentx-types): Static definition (who am I?)
 * - **AgentContext** (agentx-core): Runtime state (what am I doing?)
 *
 * Think of it as:
 * - Agent: "I am Claude, a writing assistant"
 * - AgentContext: "I'm currently talking to user-123 in session-456"
 */
export interface AgentContext {
  /**
   * Session ID (framework-level)
   *
   * Our session identifier, used for:
   * - Tracking conversation context
   * - Session persistence and retrieval
   * - Mapping to Session in SessionService
   */
  sessionId: string;

  /**
   * Driver session ID (driver-level)
   *
   * The underlying driver's session identifier (e.g., Claude SDK session ID).
   * Used for:
   * - Driver-level session recovery
   * - Mapping framework session to driver session
   * - Coordinating with driver's internal state
   *
   * Optional because:
   * - Not all drivers support sessions
   * - Some drivers are stateless
   */
  driverSessionId?: string;

  /**
   * Peer ID (who is the counterpart in this conversation)
   *
   * From Agent's perspective, the peer can be:
   * - A user (human)
   * - Another agent (agent-to-agent conversation)
   * - A system/service (API, automation)
   *
   * Optional because:
   * - Some sessions are agent-initiated (no peer)
   * - Background tasks or automated workflows
   */
  peerId?: string;

  /**
   * Context creation time
   */
  createdAt: number;

  /**
   * Additional runtime metadata
   *
   * Examples:
   * - Request ID
   * - Trace ID (for distributed tracing)
   * - Environment info (dev, staging, prod)
   * - Custom application-level context
   */
  metadata?: Record<string, unknown>;
}
