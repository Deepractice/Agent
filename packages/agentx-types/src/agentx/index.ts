/**
 * AgentX Platform Contract Layer
 *
 * AgentX is the application context - the central entry point
 * for all agent operations, like Express app or Vue app.
 *
 * ## Design Decision: Local vs Remote Modes
 *
 * Two operational modes with different capabilities:
 *
 * | Feature      | Local                  | Remote                    |
 * |--------------|------------------------|---------------------------|
 * | Agent create | In-memory, sync        | Via HTTP API              |
 * | Sessions     | LocalSessionManager    | RemoteSessionManager      |
 * | Errors       | ErrorManager           | Client handles errors     |
 * | Platform     | N/A                    | PlatformManager           |
 *
 * Why the split?
 * - Local: Direct access to agent instances, no network overhead
 * - Remote: Network-based, browser can control server-side agents
 *
 * ## API Design
 *
 * ```text
 * agentx
 * ├── .agents.*     Agent lifecycle (create, get, destroy)
 * ├── .sessions.*   Session management (create, get, list)
 * ├── .errors.*     Error handling (Local only)
 * └── .platform.*   Platform info (Remote only)
 * ```
 *
 * ## Design Decision: Manager + Endpoint Pattern
 *
 * Each module has two parts:
 * - **Manager**: TypeScript API interface (agentx.agents.create())
 * - **Endpoint**: HTTP API contracts (POST /agents)
 *
 * This enables:
 * - Type-safe HTTP API definitions
 * - Framework-agnostic endpoint contracts
 * - Easy API documentation generation
 *
 * ## Design Decision: Definition vs Instance
 *
 * Agent creation is split between two packages:
 * - **agentx-adk**: defineAgent() - Development time, creates blueprint
 * - **agentx**: agentx.agents.create() - Runtime, creates instance
 *
 * ```typescript
 * // Development time (agentx-adk)
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   driver: ClaudeDriver,
 * });
 *
 * // Runtime (agentx)
 * const agent = agentx.agents.create(MyAgent, config);
 * ```
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
