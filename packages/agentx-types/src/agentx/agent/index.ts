/**
 * Agent module - Agent lifecycle management
 *
 * - AgentManager: TypeScript API (agentx.agents.*)
 * - AgentEndpoint: HTTP API contracts
 */

export type { AgentManager } from "./AgentManager";

// Endpoint types
export type {
  AgentInfo,
  ListAgentsResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  ListAgentsEndpoint,
  GetAgentEndpoint,
  CreateAgentEndpoint,
  DestroyAgentEndpoint,
} from "./AgentEndpoint";
