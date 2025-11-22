/**
 * AgentContext
 *
 * Runtime context for an agent instance.
 * Captures the execution state and environment of a running agent.
 *
 * Separation of concerns:
 * - **Agent** (agentx-types): Static definition (who am I?)
 * - **AgentContext** (agentx-engine): Runtime state (what am I doing?)
 *
 * Note: Session management (sessionId) is handled at Core layer (AgentRegistry),
 * not at Engine layer. Engine only tracks driver-level context.
 */
export interface AgentContext {
  /**
   * Driver session ID (driver-level)
   *
   * The underlying driver's session identifier (e.g., Claude SDK session ID).
   * Used for:
   * - Driver-level session recovery
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
