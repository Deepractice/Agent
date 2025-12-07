/**
 * @agentxjs/agent
 *
 * Agent package - Event Processing Unit for AI conversations.
 *
 * ## Core API
 *
 * ```typescript
 * import { createAgent } from "@agentxjs/agent";
 *
 * const agent = createAgent({
 *   driver: myDriver,
 *   presenter: myPresenter,
 * });
 *
 * agent.on("text_delta", (e) => console.log(e.data.text));
 * await agent.receive("Hello!");
 * ```
 *
 * ## Architecture
 *
 * - Driver: Produces StreamEvents from LLM
 * - Agent: Processes events, manages state and queue
 * - Presenter: Consumes AgentOutput events
 *
 * @packageDocumentation
 */

// ============================================================================
// Core API
// ============================================================================

export { createAgent } from "./createAgent";
export { AgentStateMachine } from "./AgentStateMachine";
export type { AgentEngine, CreateAgentOptions } from "@agentxjs/types/agent";

// ============================================================================
// Engine (Stateless)
// ============================================================================

// MealyMachine
export { MealyMachine, createMealyMachine } from "./engine/MealyMachine";

// AgentProcessor (for advanced use cases)
export {
  agentProcessor,
  createInitialAgentEngineState,
  type AgentEngineState,
  type AgentProcessorInput,
  type AgentProcessorOutput,
} from "./engine/AgentProcessor";

// Internal Processors (for advanced use cases)
export {
  // MessageAssembler
  messageAssemblerProcessor,
  messageAssemblerProcessorDef,
  type MessageAssemblerInput,
  type MessageAssemblerOutput,
  type MessageAssemblerState,
  type PendingContent,
  createInitialMessageAssemblerState,
  // StateEventProcessor
  stateEventProcessor,
  stateEventProcessorDef,
  type StateEventProcessorInput,
  type StateEventProcessorOutput,
  type StateEventProcessorContext,
  createInitialStateEventProcessorContext,
  // TurnTracker
  turnTrackerProcessor,
  turnTrackerProcessorDef,
  type TurnTrackerInput,
  type TurnTrackerOutput,
  type TurnTrackerState,
  type PendingTurn,
  createInitialTurnTrackerState,
} from "./engine/internal";

// Mealy Machine Core (for building custom processors)
export {
  // Core types
  type Source,
  type SourceDefinition,
  type Processor,
  type ProcessorResult,
  type ProcessorDefinition,
  type Sink,
  type SinkDefinition,
  type Store,
  MemoryStore,
  // Combinators
  combineProcessors,
  combineInitialStates,
  chainProcessors,
  filterProcessor,
  mapOutput,
  withLogging,
  identityProcessor,
} from "./engine/mealy";
