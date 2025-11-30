/**
 * AgentX Core
 *
 * Agent runtime - the stateful layer of AgentX.
 * Builds on top of the stateless Engine to provide lifecycle management.
 *
 * ## Design Principles
 *
 * 1. **Stateful Coordination**: Manages Agent lifecycle, Engine is stateless
 * 2. **Event-Driven**: All communication via RxJS-based EventBus
 * 3. **Role Separation**: Producer/Consumer views for EventBus access control
 *
 * ## Key Design Decisions
 *
 * ### 1. Why Separate Core from Engine?
 *
 * **Problem**: Where should agent state live?
 *
 * **Decision**: Engine is pure (stateless Mealy Machines), Core is stateful.
 *
 * **Rationale**:
 * - Engine can be tested in isolation (pure functions)
 * - Core handles lifecycle concerns (create, destroy, interrupts)
 * - Clear separation: "event processing" vs "instance management"
 *
 * ### 2. Why RxJS for EventBus?
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
 * ### 3. Why Middleware + Interceptor Pattern?
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
 * ### 4. Why StateMachine Driven by Events?
 *
 * **Problem**: How to track agent conversation state?
 *
 * **Decision**: StateMachine listens to State Layer events from Engine.
 *
 * **Flow**:
 * 1. Driver yields Stream events
 * 2. Engine's StateEventProcessor generates State events
 * 3. StateMachine transitions based on State events
 * 4. UI subscribes to state changes via onStateChange()
 *
 * **Benefits**:
 * - Single source of truth (Engine generates state events)
 * - StateMachine is reactive (not imperative)
 * - Easy to debug (state changes are events)
 *
 * @packageDocumentation
 */

// ===== Agent Implementations =====
export {
  // Types (re-exported from @deepractice-ai/agentx-types)
  type Agent,
  type AgentContext,
  type AgentDriver,
  type AgentPresenter,
  type AgentDefinition,
  type AgentLifecycle,
  type AgentEventHandler,
  type AgentEventType,
  type Unsubscribe,
  type AgentContainer,
  type AgentOutput,
  // Classes (implementations)
  AgentInstance,
  MemoryAgentContainer,
  // Functions
  generateAgentId,
  createAgentContext,
} from "./agent";
