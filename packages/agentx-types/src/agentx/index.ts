/**
 * AgentX Platform Contract Layer
 *
 * AgentX is the application context - the central entry point
 * for all agent operations, like Express app or Vue app.
 *
 * Two modes:
 * - Local (AgentXLocal): Direct in-memory operations
 * - Remote (AgentXRemote): Operations via network
 *
 * API Design:
 * - agentx.agents.* - Agent lifecycle (create, get, destroy) [Runtime only]
 * - agentx.errors.* - Error handling (Local only)
 * - agentx.sessions.* - Session management
 * - agentx.platform.* - Platform info (Remote only)
 *
 * Note: Agent definition is done via defineAgent from @deepractice-ai/agentx-adk
 *
 * Structure:
 * - *Manager: TypeScript API interface
 * - *Endpoint: HTTP API contracts (method + path + input + output)
 */

// Main platform interfaces
export type { AgentX, AgentXLocal, AgentXRemote } from "./AgentX";

// Factory function and options
export type { AgentXOptions, AgentXLocalOptions, AgentXRemoteOptions } from "./createAgentX";
export { createAgentX } from "./createAgentX";

// Configuration types
export type { RemoteConfig } from "./AgentXConfig";

// Base Endpoint type
export type { Endpoint, HttpMethod } from "./Endpoint";

// Agent module (Manager + Endpoints)
export type {
  AgentManager,
  AgentInfo,
  ListAgentsResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  ListAgentsEndpoint,
  GetAgentEndpoint,
  CreateAgentEndpoint,
  DestroyAgentEndpoint,
} from "./agent";

// Error module (Local only)
export type { ErrorManager, ErrorHandler } from "./error";

// Session module (Manager + Endpoints)
export type {
  SessionManager,
  LocalSessionManager,
  RemoteSessionManager,
  ListSessionsResponse,
  CreateSessionEndpoint,
  GetSessionEndpoint,
  ListSessionsEndpoint,
  DestroySessionEndpoint,
} from "./session";

// Platform module (Manager + Endpoints)
export type {
  PlatformManager,
  PlatformInfo,
  HealthStatus,
  GetInfoEndpoint,
  GetHealthEndpoint,
} from "./platform";

// Provider types
export type { ProviderKey } from "./ProviderKey";
export { createProviderKey, LoggerFactoryKey } from "./ProviderKey";
