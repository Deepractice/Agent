/**
 * Mealy - The Mealy Machine runtime
 *
 * A Mealy Machine is a finite-state machine where outputs depend on
 * both the current state AND the input: (state, input) => (state, output)
 *
 * This runtime orchestrates the complete processing pipeline:
 * 1. Sources receive external input (side effects)
 * 2. Processors process inputs (pure Mealy transition functions)
 * 3. Sinks produce output effects (side effects)
 *
 * Architecture:
 * - Inputs enter through Sources (input adapters)
 * - Processors transform inputs (pure functions, state is means)
 * - Sinks produce actions (output adapters)
 *
 * @template TState - The state type (accumulator, means to an end)
 * @template TInput - The input/output type for Processors
 *
 * @example
 * ```typescript
 * const mealy = createMealy({
 *   processor: messageProcessor,
 *   store: new MemoryStore(),
 *   initialState: { text: '' },
 *   sinks: [sseSink, logSink],
 * });
 *
 * // Process an input
 * mealy.process('agent_123', input);
 * ```
 */

import type { Processor } from "./Processor";
import type { Store } from "./Store";
import type { Sink, SinkDefinition } from "./Sink";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("engine/Mealy");

/**
 * MealyConfig - Configuration for creating a Mealy instance
 */
export interface MealyConfig<TState, TInput> {
  /**
   * The processor function to execute (pure Mealy transition function)
   */
  processor: Processor<TState, TInput, TInput>;

  /**
   * The store for state persistence
   */
  store: Store<TState>;

  /**
   * Initial state for new IDs
   */
  initialState: TState;

  /**
   * Sinks to receive outputs
   * Can be simple Sink functions or SinkDefinitions with filter/name
   */
  sinks?: (Sink<TInput> | SinkDefinition<TInput>)[];

  /**
   * Whether to recursively process outputs
   * If true, outputs are fed back into the processor
   *
   * @default true
   */
  recursive?: boolean;

  /**
   * Maximum recursion depth to prevent infinite loops
   *
   * @default 100
   */
  maxDepth?: number;
}

/**
 * ProcessResult - Result of processing an input
 */
export interface ProcessResult<TState, TOutput> {
  /**
   * The new state after processing
   */
  state: TState;

  /**
   * All outputs produced (including from recursion)
   */
  outputs: TOutput[];

  /**
   * Number of processor invocations (including recursion)
   */
  processCount: number;
}

/**
 * Mealy - Mealy Machine runtime
 *
 * Implements the Mealy Machine pattern: (state, input) => (state, output)
 * where output depends on both current state and input.
 */
export class Mealy<TState, TInput> {
  private readonly processor: Processor<TState, TInput, TInput>;
  private readonly store: Store<TState>;
  private readonly initialState: TState;
  private readonly sinks: (Sink<TInput> | SinkDefinition<TInput>)[];
  private readonly recursive: boolean;
  private readonly maxDepth: number;

  constructor(config: MealyConfig<TState, TInput>) {
    this.processor = config.processor;
    this.store = config.store;
    this.initialState = config.initialState;
    this.sinks = config.sinks ?? [];
    this.recursive = config.recursive ?? true;
    this.maxDepth = config.maxDepth ?? 100;

    logger.debug("Mealy instance created", {
      sinkCount: this.sinks.length,
      recursive: this.recursive,
      maxDepth: this.maxDepth,
    });
  }

  /**
   * Process an input through the Mealy Machine
   *
   * @param id - Unique identifier (e.g., agentId)
   * @param input - The input to process
   * @returns Result containing new state and all outputs
   */
  process(id: string, input: TInput): ProcessResult<TState, TInput> {
    return this.processInternal(id, input, 0);
  }

  /**
   * Internal process with depth tracking
   */
  private processInternal(id: string, input: TInput, depth: number): ProcessResult<TState, TInput> {
    // Guard against infinite recursion
    if (depth >= this.maxDepth) {
      logger.warn("Max recursion depth reached", {
        id,
        maxDepth: this.maxDepth,
        depth,
      });
      return {
        state: this.store.get(id) ?? this.initialState,
        outputs: [],
        processCount: 0,
      };
    }

    // 1. Get current state (or initialize)
    let state = this.store.get(id);
    if (state === undefined) {
      state = this.initialState;
    }

    // 2. Execute pure processor function (Mealy transition)
    const [newState, outputs] = this.processor(state, input);

    // 3. Save new state to store
    this.store.set(id, newState);

    // 4. Collect all outputs
    const allOutputs: TInput[] = [...outputs];
    let processCount = 1;

    // 5. Send outputs to sinks
    if (outputs.length > 0) {
      this.sendToSinks(id, outputs);
    }

    // 6. Optionally recurse on outputs
    if (this.recursive) {
      for (const output of outputs) {
        const result = this.processInternal(id, output, depth + 1);
        allOutputs.push(...result.outputs);
        processCount += result.processCount;
      }
    }

    return {
      state: newState,
      outputs: allOutputs,
      processCount,
    };
  }

  /**
   * Send outputs to all sinks
   */
  private sendToSinks(id: string, outputs: TInput[]): void {
    for (const sink of this.sinks) {
      // Check if sink is a function or SinkDefinition
      if (typeof sink === "function") {
        // Simple Sink function: (id, outputs) => void
        try {
          const result = sink(id, outputs);
          if (result instanceof Promise) {
            result.catch((error) => {
              logger.error("Sink error (async)", { id, error });
            });
          }
        } catch (error) {
          logger.error("Sink error (sync)", { id, error });
        }
      } else {
        // SinkDefinition with filter/name
        const filteredOutputs = sink.filter ? outputs.filter(sink.filter) : outputs;

        if (filteredOutputs.length === 0) {
          continue;
        }

        try {
          const result = sink.sink(id, filteredOutputs);
          if (result instanceof Promise) {
            result.catch((error) => {
              logger.error("Named sink error (async)", {
                id,
                sinkName: sink.name,
                error,
              });
            });
          }
        } catch (error) {
          logger.error("Named sink error (sync)", {
            id,
            sinkName: sink.name,
            error,
          });
        }
      }
    }
  }

  /**
   * Get current state for an ID (without processing)
   */
  getState(id: string): TState | undefined {
    return this.store.get(id);
  }

  /**
   * Check if state exists for an ID
   */
  hasState(id: string): boolean {
    return this.store.has(id);
  }

  /**
   * Delete state for an ID (cleanup)
   */
  cleanup(id: string): void {
    logger.debug("Cleaning up state", { id });
    this.store.delete(id);
  }

  /**
   * Add a sink at runtime
   */
  addSink(sink: Sink<TInput> | SinkDefinition<TInput>): void {
    const sinkName = typeof sink === "function" ? "(anonymous)" : sink.name;
    logger.debug("Adding sink", { sinkName });
    this.sinks.push(sink);
  }

  /**
   * Remove a sink by name (only works for SinkDefinitions)
   */
  removeSink(name: string): boolean {
    const index = this.sinks.findIndex((s) => typeof s !== "function" && s.name === name);
    if (index !== -1) {
      this.sinks.splice(index, 1);
      logger.debug("Removed sink", { name });
      return true;
    }
    logger.debug("Sink not found for removal", { name });
    return false;
  }
}

/**
 * createMealy - Factory function for creating Mealy Machine instances
 *
 * @example
 * ```typescript
 * const mealy = createMealy({
 *   processor: myProcessor,
 *   store: new MemoryStore(),
 *   initialState: { count: 0 },
 *   sinks: [logSink],
 * });
 * ```
 */
export function createMealy<TState, TInput>(
  config: MealyConfig<TState, TInput>
): Mealy<TState, TInput> {
  return new Mealy(config);
}
