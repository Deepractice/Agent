/**
 * Agent Endpoints - HTTP API contracts for Agent operations
 */

import type { Endpoint } from "~/agentx/Endpoint";

// ============================================================================
// Request/Response Types
// ============================================================================

export interface AgentInfo {
  agentId: string;
  name: string;
  description?: string;
  status: "active" | "idle" | "error";
  createdAt: number;
}

export interface ListAgentsResponse {
  agents: AgentInfo[];
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  config: Record<string, unknown>;
}

export interface CreateAgentResponse {
  agentId: string;
  name: string;
  status: "active" | "idle";
}

// ============================================================================
// Endpoints
// ============================================================================

/**
 * List all Agents
 * GET /agents
 */
export interface ListAgentsEndpoint extends Endpoint<"GET", "/agents", void, ListAgentsResponse> {}

/**
 * Get single Agent
 * GET /agents/:agentId
 */
export interface GetAgentEndpoint
  extends Endpoint<"GET", "/agents/:agentId", { agentId: string }, AgentInfo> {}

/**
 * Create Agent
 * POST /agents
 */
export interface CreateAgentEndpoint
  extends Endpoint<"POST", "/agents", CreateAgentRequest, CreateAgentResponse> {}

/**
 * Destroy Agent
 * DELETE /agents/:agentId
 */
export interface DestroyAgentEndpoint
  extends Endpoint<"DELETE", "/agents/:agentId", { agentId: string }, void> {}
