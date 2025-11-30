/**
 * AgentX Platform
 *
 * "Define Once, Run Anywhere"
 *
 * The unified API for AI Agent lifecycle management.
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
 * @example
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
 * @packageDocumentation
 */

// ===== Core API =====

export { defineAgent } from "./defineAgent";
export { createAgentX } from "./AgentX";

// ===== Re-export Types from @deepractice-ai/agentx-types =====

export type {
  // AgentX platform
  AgentX,
  AgentXLocal,
  AgentXRemote,
  // defineAgent
  DefineAgentInput,
  // Agent module
  AgentManager,
  // Error module
  ErrorManager,
  ErrorHandler,
  // Session module
  SessionManager,
  LocalSessionManager,
  RemoteSessionManager,
  Session,
  // Platform module
  PlatformManager,
  // HTTP Endpoints
  AgentInfo,
  ListAgentsResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  ListAgentsEndpoint,
  GetAgentEndpoint,
  CreateAgentEndpoint,
  DestroyAgentEndpoint,
  ListSessionsResponse,
  CreateSessionEndpoint,
  GetSessionEndpoint,
  ListSessionsEndpoint,
  DestroySessionEndpoint,
  PlatformInfo,
  HealthStatus,
  GetInfoEndpoint,
  GetHealthEndpoint,
  // Agent contracts
  Agent,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
  AgentContainer,
  AgentContext,
  AgentOutput,
  AgentLifecycle,
  AgentEventHandler,
  AgentEventType,
  Unsubscribe,
  // Runtime types
  Runtime,
  RuntimeDriver,
  RuntimeConfig,
  Container,
  Sandbox,
  // Error types
  AgentError,
  ErrorSeverity,
} from "@deepractice-ai/agentx-types";
