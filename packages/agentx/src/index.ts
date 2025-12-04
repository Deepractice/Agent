/**
 * AgentX Platform
 *
 * "Define Once, Run Anywhere"
 *
 * The unified API for AI Agent lifecycle management.
 *
 * ## Architecture Decision Record (ADR)
 *
 * ### ADR-001: Docker-Style Layered Architecture
 *
 * AgentX follows Docker's layered model:
 *
 * ```
 * Definition  →  build  →  Image  →  run  →  Agent
 * (template)              (snapshot)        (runtime)
 * ```
 *
 * | Docker     | AgentX     | Description                    |
 * |------------|------------|--------------------------------|
 * | Dockerfile | Definition | Source template (code level)   |
 * | Image      | Image      | Built artifact (persisted)     |
 * | Container  | Agent      | Running instance (runtime)     |
 * | -          | Session    | Our wrapper (UI/external view) |
 *
 * **Key Principle**: Definition cannot directly become Agent.
 * Must go through build step to create Image first.
 *
 * ### ADR-002: Session as External Wrapper
 *
 * Session is AgentX-specific (Docker doesn't have this).
 * It wraps Image for external concerns:
 * - User ownership (userId)
 * - UI display (title, metadata)
 * - External system integration
 *
 * Image is internal (frozen runtime state).
 * Session is external (user-facing view).
 *
 * ### ADR-003: AgentX API Scope
 *
 * AgentX API only handles "above object" operations:
 * - create / build / run
 * - destroy / delete
 * - list
 * - get / query
 *
 * Object-level methods belong to the object itself:
 * - agent.receive(), agent.on(), agent.interrupt()
 * - session.resume(), session.fork(), session.setTitle()
 *
 * ## API Overview
 *
 * ```typescript
 * // definitions - Template registry
 * agentx.definitions.register(definition)
 * agentx.definitions.get(name)
 * agentx.definitions.list()
 * agentx.definitions.unregister(name)
 *
 * // images - Image management
 * agentx.images.build(definitionName, config)
 * agentx.images.get(imageId)
 * agentx.images.list()
 * agentx.images.delete(imageId)
 *
 * // agents - Runtime management
 * agentx.agents.run(imageId)
 * agentx.agents.get(agentId)
 * agentx.agents.list()
 * agentx.agents.destroy(agentId)
 *
 * // sessions - User session management
 * agentx.sessions.create(imageId, userId)
 * agentx.sessions.get(sessionId)
 * agentx.sessions.list()
 * agentx.sessions.listByUser(userId)
 * agentx.sessions.delete(sessionId)
 * ```
 *
 * ## Two Roles
 *
 * 1. **Application Developer** - Uses AgentX
 *    - defineAgent() - Define agent template
 *    - createAgentX(runtime) - Create platform
 *    - agentx.images.build() - Build image
 *    - agentx.agents.run() - Run agent
 *
 * 2. **Platform Developer** - Implements Runtime
 *    - NodeRuntime, BrowserRuntime
 *    - createDriver, createSandbox
 *
 * @example
 * ```typescript
 * import { defineAgent, createAgentX } from "agentxjs";
 * import { runtime } from "agentxjs/runtime/node";
 *
 * // 1. Define template
 * const TranslatorDef = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * // 2. Create platform
 * const agentx = createAgentX(runtime);
 *
 * // 3. Register definition
 * agentx.definitions.register(TranslatorDef);
 *
 * // 4. Build image
 * const image = await agentx.images.build("Translator", { model: "claude-3" });
 *
 * // 5. Run agent
 * const agent = agentx.agents.run(image.imageId);
 *
 * // 6. Use agent (object-level API)
 * await agent.receive("Hello!");
 * ```
 *
 * @packageDocumentation
 */

// ===== Core API =====

export { defineAgent } from "./defineAgent";
export { createAgentX } from "./AgentX";

// ===== Re-export Types from @agentxjs/types =====

export type {
  // AgentX platform
  AgentX,
  AgentXLocal,
  AgentXRemote,
  // defineAgent
  DefineAgentInput,
  // Container module
  ContainerManager,
  // Agent module
  AgentManager,
  // Error module
  ErrorManager,
  ErrorHandler,
  // Session module
  SessionManager,
  Session,
  // Platform module
  PlatformManager,
  // HTTP Endpoints (static resources only)
  Endpoint,
  HttpMethod,
  ListDefinitionsResponse,
  ListDefinitionsEndpoint,
  GetDefinitionEndpoint,
  RegisterDefinitionEndpoint,
  UnregisterDefinitionEndpoint,
  ListImagesResponse,
  ListMetaImagesResponse,
  ListImagesEndpoint,
  ListMetaImagesEndpoint,
  GetImageEndpoint,
  GetMetaImageEndpoint,
  DeleteImageEndpoint,
  PlatformInfo,
  HealthStatus,
  GetInfoEndpoint,
  GetHealthEndpoint,
  // Agent contracts
  Agent,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
  Container,
  AgentContext,
  AgentOutput,
  AgentLifecycle,
  AgentEventHandler,
  AgentEventType,
  Unsubscribe,
  // Runtime types
  Runtime,
  RuntimeDriver,
  Sandbox,
  // Repository types
  ContainerRecord,
  ContainerConfig,
  // Error types
  AgentError,
  ErrorSeverity,
} from "@agentxjs/types";
