/**
 * @deepractice-ai/agentx-mealy
 *
 * Mealy - Functional Mealy Machine Framework for AgentX
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
 * Core Architecture:
 * ```
 * Source (input, side effects)
 *     ↓
 * Processor (state, input) => [newState, outputs]  (pure Mealy transition)
 *     ↓
 * Sink (output, side effects)
 * ```
 *
 * Key Insight: Unlike Redux reducers where state is the goal,
 * in Mealy Machine the state is just a means - outputs are the goal.
 *
 * @example
 * ```typescript
 * import {
 *   createMealy,
 *   MemoryStore,
 *   type Processor,
 *   type Sink,
 * } from '@deepractice-ai/agentx-mealy';
 *
 * // Define a processor (pure Mealy transition function)
 * const counterProcessor: Processor<CounterState, CounterEvent, CounterEvent> =
 *   (state, input) => {
 *     switch (input.type) {
 *       case 'increment':
 *         return [{ count: state.count + 1 }, []];
 *       case 'decrement':
 *         return [{ count: state.count - 1 }, []];
 *       default:
 *         return [state, []];
 *     }
 *   };
 *
 * // Define a sink (side effects)
 * const logSink: Sink<CounterEvent> = (id, outputs) => {
 *   outputs.forEach(output => console.log(`[${id}]`, output));
 * };
 *
 * // Create the Mealy Machine
 * const mealy = createMealy({
 *   processor: counterProcessor,
 *   store: new MemoryStore(),
 *   initialState: { count: 0 },
 *   sinks: [logSink],
 * });
 *
 * // Process inputs
 * mealy.process('user_1', { type: 'increment' });
 * console.log(mealy.getState('user_1')); // { count: 1 }
 * ```
 *
 * @packageDocumentation
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
