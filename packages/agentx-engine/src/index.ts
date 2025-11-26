/**
 * @deepractice-ai/agentx-engine
 *
 * Stateless Event Processing Engine for AgentX
 *
 * This package provides a completely STATELESS event processing engine.
 * All intermediate state is kept in local variables during processing.
 * Business data persistence is handled by Presenters.
 *
 * Architecture:
 * - Driver: Input adapter (UserMessage → StreamEvents)
 * - Processor: Pure Mealy transition function (state, input) => [state, outputs]
 * - Presenter: Output adapter (events → external systems / persistence)
 * - AgentEngine: Stateless runtime that orchestrates the above
 *
 * State Management:
 * - Engine has NO persistent state - can be shared across requests
 * - Processor intermediate state (pendingContents, etc.) is local variables
 * - Business data (messages, statistics) is persisted via Presenters
 * - Multiple Engine instances can share the same database
 *
 * @example
 * ```typescript
 * import {
 *   AgentEngine,
 *   createStreamPresenter,
 *   createMessagePresenter,
 *   createTurnPresenter,
 *   type Driver,
 * } from '@deepractice-ai/agentx-engine';
 *
 * // Define driver (connects to AI SDK)
 * const claudeDriver: Driver = async function* (message) {
 *   for await (const chunk of claudeSDK.stream(message)) {
 *     yield transformToStreamEvent(chunk);
 *   }
 * };
 *
 * // Create STATELESS engine
 * const engine = new AgentEngine({
 *   driver: claudeDriver,
 *   presenters: [
 *     // Forward stream events to SSE
 *     createStreamPresenter((id, event) => sseConnection.send(id, event)),
 *     // Persist messages to session store (database)
 *     createMessagePresenter((id, event) => sessionStore.addMessage(id, event.data)),
 *     // Persist statistics (cost, tokens, duration)
 *     createTurnPresenter((id, event) => statsStore.addTurn(id, event.data)),
 *   ],
 * });
 *
 * // Engine can handle any agentId - state is external
 * await engine.receive('agent_123', { role: 'user', content: 'Hello!' });
 * await engine.receive('agent_456', { role: 'user', content: 'Hi there!' });
 * ```
 *
 * @packageDocumentation
 */

// ===== Public API (External) =====

// Driver - Input adapter
export { type Driver, type DriverDefinition } from "./Driver";

// Presenter - Output adapter
export {
  type Presenter,
  type PresenterDefinition,
  type AgentOutput,
  // Typed presenters
  type StreamPresenter,
  type StatePresenter,
  type MessagePresenter,
  type TurnPresenter,
  // Type guards
  isStreamEvent,
  isStateEvent,
  isMessageEvent,
  isTurnEvent,
  // Helper functions
  createStreamPresenter,
  createStatePresenter,
  createMessagePresenter,
  createTurnPresenter,
} from "./Presenter";

// AgentProcessor - Combined processor (internal use)
export {
  agentProcessor,
  createInitialAgentEngineState,
  type AgentEngineState,
  type AgentProcessorInput,
  type AgentProcessorOutput,
} from "./AgentProcessor";

// AgentEngine - Stateless Runtime
export { AgentEngine, createAgentEngine, type AgentEngineConfig } from "./AgentEngine";

// ===== Internal exports (for advanced use cases) =====

export {
  // MessageAssembler
  messageAssemblerProcessor,
  messageAssemblerProcessorDef,
  type MessageAssemblerInput,
  type MessageAssemblerOutput,
  type MessageAssemblerState,
  type PendingContent,
  createInitialMessageAssemblerState,
  // StateMachine
  stateMachineProcessor,
  stateMachineProcessorDef,
  type StateMachineInput,
  type StateMachineOutput,
  type StateMachineState,
  createInitialStateMachineState,
  // TurnTracker
  turnTrackerProcessor,
  turnTrackerProcessorDef,
  type TurnTrackerInput,
  type TurnTrackerOutput,
  type TurnTrackerState,
  type PendingTurn,
  createInitialTurnTrackerState,
} from "./internal";

// ===== Re-export Mealy types for advanced use cases =====
// Note: Store/MemoryStore not exported - Engine is stateless
// Business data persistence is handled by Presenters, not Engine

export {
  // Core types
  type Source,
  type SourceDefinition,
  type Processor,
  type ProcessorResult,
  type ProcessorDefinition,
  type Sink,
  type SinkDefinition,
  // Combinators (for building custom processors)
  combineProcessors,
  combineInitialStates,
  chainProcessors,
  filterProcessor,
  mapOutput,
  withLogging,
  identityProcessor,
} from "@deepractice-ai/agentx-mealy";
