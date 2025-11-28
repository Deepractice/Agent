/**
 * @deepractice-ai/agentx-engine
 *
 * Pure Mealy Machine Event Processing Engine for AgentX
 *
 * This package provides a stateless event processor that transforms
 * stream events into higher-level events (state, message, turn events).
 *
 * Key Design:
 * - Engine is a pure Mealy Machine: process(agentId, event) → outputs
 * - Engine does NOT hold driver or presenters (those belong to Agent layer)
 * - Engine manages intermediate processing state per agentId
 * - Multiple agents can share the same Engine instance
 *
 * Architecture:
 * ```
 * Agent Layer (agentx-core)
 *     │
 *     │ driver.receive(message, context)
 *     ▼
 * StreamEvents
 *     │
 *     │ engine.process(agentId, event)
 *     ▼
 * AgentEngine (this package)
 *     │
 *     │ outputs (state, message, turn events)
 *     ▼
 * Agent Layer (presenters)
 * ```
 *
 * @example
 * ```typescript
 * import { AgentEngine } from '@deepractice-ai/agentx-engine';
 *
 * const engine = new AgentEngine();
 *
 * // Agent layer coordinates the flow:
 * for await (const streamEvent of driver.receive(message, context)) {
 *   const outputs = engine.process(agentId, streamEvent);
 *   for (const output of outputs) {
 *     presenters.forEach(p => p.present(agentId, output));
 *     handlers.forEach(h => h(output));
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// ===== AgentEngine =====
export { AgentEngine, createAgentEngine } from "./AgentEngine";

// ===== AgentProcessor (for advanced use cases) =====
export {
  agentProcessor,
  createInitialAgentEngineState,
  type AgentEngineState,
  type AgentProcessorInput,
  type AgentProcessorOutput,
} from "./AgentProcessor";

// ===== Internal Processors (for advanced use cases) =====
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
} from "./internal";

// ===== Mealy Machine Core (for building custom processors) =====
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
} from "~/mealy";
