/**
 * AgentX Platform Contract Layer
 *
 * "Define Once, Run Anywhere"
 *
 * AgentX is the application context - the central entry point
 * for all agent operations.
 *
 * ## Two Roles
 *
 * 1. **Application Developer** - Uses AgentX
 *    - defineAgent() - Define agent template
 *    - createAgentX(runtime) - Create platform
 *    - agentx.agents.create() - Create instance
 *
 * 2. **Platform Developer** - Implements Runtime
 *    - NodeRuntime, BrowserRuntime
 *    - createDriver, createSandbox
 *
 * ## Usage
 *
 * ```typescript
 * import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 * ```
 *
 * ## API Design
 *
 * ```text
 * agentx
 * ├── .agents.*     Agent lifecycle (create, get, destroy)
 * ├── .sessions.*   Session management (create, get, list)
 * └── .errors.*     Error handling
 * ```
 */

// Main platform interfaces
export type { AgentX, AgentXLocal, AgentXRemote } from "./AgentX";

// Factory function
export { createAgentX } from "./createAgentX";

// defineAgent
export type { DefineAgentInput } from "./defineAgent";
export { defineAgent } from "./defineAgent";

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

// Definition module (Manager)
export type { DefinitionManager } from "./definition";

// Image module (Manager)
export type { ImageManager } from "./image";

// Provider types
export type { ProviderKey } from "./ProviderKey";
export { createProviderKey, LoggerFactoryKey } from "./ProviderKey";
