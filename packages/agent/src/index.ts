/**
 * AgentX Agent
 *
 * Agent runtime - the stateful layer of AgentX.
 * Builds on top of the stateless Engine to provide lifecycle management.
 *
 * ## Design Principles
 *
 * 1. **"Define Once, Run Anywhere"**: AgentDefinition is business config only
 * 2. **Runtime-Injected Driver**: Driver created by Runtime, not AgentDefinition
 * 3. **Sandbox Isolation**: Each Agent has isolated OS + LLM resources
 * 4. **Event-Driven**: All communication via RxJS-based EventBus
 *
 * ## Key Design Decisions
 *
 * ### 1. Why Separate Agent from Engine?
 *
 * **Problem**: Where should agent state live?
 *
 * **Decision**: Engine is pure (stateless Mealy Machines), Agent is stateful.
 *
 * **Rationale**:
 * - Engine can be tested in isolation (pure functions)
 * - Agent handles lifecycle concerns (create, destroy, interrupts)
 * - Clear separation: "event processing" vs "instance management"
 *
 * ### 2. Why Runtime-Injected Driver?
 *
 * **Problem**: AgentDefinition used to contain driver reference. But this
 * couples business config to infrastructure details.
 *
 * **Decision**: AgentDefinition only has business config (name, systemPrompt).
 * Runtime creates Driver from AgentDefinition + RuntimeConfig.
 *
 * **Benefits**:
 * - Same AgentDefinition works on Server and Browser
 * - Infrastructure config (apiKey) collected from environment
 * - Clear separation: "what agent does" vs "how to run it"
 *
 * ### 3. Why Sandbox per Agent?
 *
 * **Problem**: Multiple agents may need isolated resources.
 *
 * **Decision**: Each Agent holds a Sandbox reference (OS + LLM).
 *
 * **Benefits**:
 * - Resource isolation between agents
 * - Different agents can have different cwd, env
 * - Prepares for cloud deployment (directory isolation)
 *
 * ### 4. Why RxJS for EventBus?
 *
 * **Problem**: Need flexible event subscription with filtering, priority, etc.
 *
 * **Decision**: Use RxJS Subject internally with custom API wrapper.
 *
 * **Benefits**:
 * - Powerful operators (filter, take, debounce)
 * - Type-safe subscriptions
 * - Automatic cleanup on destroy
 * - Producer/Consumer role separation
 *
 * ### 5. Why Middleware + Interceptor Pattern?
 *
 * **Problem**: Need to intercept both input (messages) and output (events).
 *
 * **Decision**: Two separate chains:
 * - Middleware: Intercepts incoming messages (before driver)
 * - Interceptor: Intercepts outgoing events (after engine)
 *
 * **Use Cases**:
 * - Middleware: rate limiting, auth, message transformation
 * - Interceptor: logging, metrics, event filtering
 *
 * @packageDocumentation
 */

// ===== Agent Implementations =====
export {
  // Types (re-exported from @agentxjs/types)
  type Agent,
  type AgentContext,
  type AgentDriver,
  type AgentPresenter,
  type AgentDefinition,
  type AgentLifecycle,
  type AgentEventHandler,
  type AgentEventType,
  type Unsubscribe,
  type Container,
  type AgentOutput,
  // Classes (implementations)
  AgentInstance,
  MemoryContainer,
  // Functions
  generateAgentId,
  createAgentContext,
} from "./agent";
