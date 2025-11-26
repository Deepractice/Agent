/**
 * Mealy - Functional Mealy Machine Framework
 *
 * A Mealy Machine is a finite-state machine where outputs depend on
 * both the current state AND the input: (state, input) => (state, output)
 *
 * Components:
 * - Source: Receives external input (input adapter with side effects)
 * - Processor: Pure Mealy transition function (state is means, outputs are goal)
 * - Sink: Produces output effects (output adapter with side effects)
 * - Store: State storage (external state persistence)
 *
 * Key Insight: Unlike Redux reducers where state is the goal,
 * in Mealy Machine the state is just a means - outputs are the goal.
 */

// ===== Core Components =====

// Source - Input (input adapter)
export { type Source, type SourceDefinition } from "./Source";

// Processor - Processing (pure Mealy transition function)
export { type Processor, type ProcessorResult, type ProcessorDefinition } from "./Processor";

// Sink - Output (output adapter)
export { type Sink, type SinkDefinition } from "./Sink";

// Store - State storage
export { type Store, MemoryStore } from "./Store";

// ===== Mealy Runtime =====

export { Mealy, createMealy, type MealyConfig, type ProcessResult } from "./Mealy";

// ===== Combinators =====

export {
  combineProcessors,
  combineInitialStates,
  chainProcessors,
  filterProcessor,
  mapOutput,
  withLogging,
  identityProcessor,
} from "./combinators";
