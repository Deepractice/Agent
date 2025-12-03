/**
 * Session Endpoints - HTTP API contracts for Session operations
 */

import type { Endpoint } from "~/agentx/Endpoint";
import type { Session } from "~/environment/session/Session";

// ============================================================================
// Response Types
// ============================================================================

export interface ListSessionsResponse {
  sessions: Session[];
}

// ============================================================================
// Endpoints
// ============================================================================

/**
 * Create Session
 * POST /agents/:agentId/sessions
 */
export interface CreateSessionEndpoint
  extends Endpoint<"POST", "/agents/:agentId/sessions", { agentId: string }, Session> {}

/**
 * Get Session
 * GET /sessions/:sessionId
 */
export interface GetSessionEndpoint
  extends Endpoint<"GET", "/sessions/:sessionId", { sessionId: string }, Session> {}

/**
 * List all Sessions for an Agent
 * GET /agents/:agentId/sessions
 */
export interface ListSessionsEndpoint
  extends Endpoint<"GET", "/agents/:agentId/sessions", { agentId: string }, ListSessionsResponse> {}

/**
 * Destroy Session
 * DELETE /sessions/:sessionId
 */
export interface DestroySessionEndpoint
  extends Endpoint<"DELETE", "/sessions/:sessionId", { sessionId: string }, void> {}
