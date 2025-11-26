/**
 * Combinators - Functions to compose multiple Processors
 *
 * These utilities allow building complex stream processing pipelines
 * from simple, composable Processor functions.
 */

import type { Processor } from "./Processor";

/**
 * combineProcessors - Combine multiple processors into one
 *
 * Each sub-processor manages its own slice of state.
 * All processors receive the same event and their outputs are merged.
 *
 * @example
 * ```typescript
 * interface CombinedState {
 *   message: MessageState;
 *   state: StateMachineState;
 *   turn: TurnState;
 * }
 *
 * const combinedProcessor = combineProcessors<CombinedState, Event, Event>({
 *   message: messageProcessor,
 *   state: stateMachineProcessor,
 *   turn: turnTrackerProcessor,
 * });
 * ```
 */
export function combineProcessors<
  TState extends Record<string, unknown>,
  TInput,
  TOutput,
>(processors: {
  [K in keyof TState]: Processor<TState[K], TInput, TOutput>;
}): Processor<TState, TInput, TOutput> {
  return (state: Readonly<TState>, event: TInput): [TState, TOutput[]] => {
    const newState = {} as TState;
    const allOutputs: TOutput[] = [];

    for (const key in processors) {
      const processor = processors[key];
      const subState = state[key];
      const [newSubState, outputs] = processor(subState, event);

      newState[key] = newSubState;
      allOutputs.push(...outputs);
    }

    return [newState, allOutputs];
  };
}

/**
 * combineInitialStates - Helper to create initial state for combined processors
 */
export function combineInitialStates<TState extends Record<string, unknown>>(initialStates: {
  [K in keyof TState]: () => TState[K];
}): () => TState {
  return () => {
    const state = {} as TState;
    for (const key in initialStates) {
      state[key] = initialStates[key]();
    }
    return state;
  };
}

/**
 * chainProcessors - Chain processors where output of one feeds into the next
 *
 * Useful for layered event processing:
 * Stream Events → Message Events → Turn Events
 *
 * @example
 * ```typescript
 * const pipeline = chainProcessors(
 *   streamToMessageProcessor,
 *   messageToTurnProcessor,
 * );
 * ```
 */
export function chainProcessors<TState, TEvent>(
  ...processors: Processor<TState, TEvent, TEvent>[]
): Processor<TState, TEvent, TEvent> {
  return (state: Readonly<TState>, event: TEvent): [TState, TEvent[]] => {
    let currentState = state as TState;
    const finalOutputs: TEvent[] = [];

    // Run the event through all processors
    for (const processor of processors) {
      const [newState, outputs] = processor(currentState, event);
      currentState = newState;
      finalOutputs.push(...outputs);
    }

    return [currentState, finalOutputs];
  };
}

/**
 * filterProcessor - Create a processor that only processes certain events
 *
 * @example
 * ```typescript
 * const textOnlyProcessor = filterProcessor(
 *   (event) => event.type === 'text_delta',
 *   textProcessor,
 * );
 * ```
 */
export function filterProcessor<TState, TInput, TOutput>(
  predicate: (event: TInput) => boolean,
  processor: Processor<TState, TInput, TOutput>
): Processor<TState, TInput, TOutput> {
  return (state: Readonly<TState>, event: TInput): [TState, TOutput[]] => {
    if (predicate(event)) {
      return processor(state, event);
    }
    return [state as TState, []];
  };
}

/**
 * mapOutput - Transform output events
 *
 * @example
 * ```typescript
 * const withTimestamp = mapOutput(
 *   myProcessor,
 *   (output) => ({ ...output, processedAt: Date.now() }),
 * );
 * ```
 */
export function mapOutput<TState, TInput, TOutput, TMapped>(
  processor: Processor<TState, TInput, TOutput>,
  mapper: (output: TOutput) => TMapped
): Processor<TState, TInput, TMapped> {
  return (state: Readonly<TState>, event: TInput): [TState, TMapped[]] => {
    const [newState, outputs] = processor(state, event);
    return [newState, outputs.map(mapper)];
  };
}

/**
 * withLogging - Add logging to a processor (for debugging)
 *
 * @example
 * ```typescript
 * const debugProcessor = withLogging(myProcessor, 'MyProcessor');
 * ```
 */
export function withLogging<TState, TInput, TOutput>(
  processor: Processor<TState, TInput, TOutput>,
  name: string,
  logger: {
    debug: (message: string, data?: unknown) => void;
  } = console
): Processor<TState, TInput, TOutput> {
  return (state: Readonly<TState>, event: TInput): [TState, TOutput[]] => {
    logger.debug(`[${name}] Input:`, { event, state });
    const [newState, outputs] = processor(state, event);
    logger.debug(`[${name}] Output:`, { newState, outputs });
    return [newState, outputs];
  };
}

/**
 * identityProcessor - A processor that does nothing (useful as default)
 */
export function identityProcessor<TState, TEvent>(): Processor<TState, TEvent, TEvent> {
  return (state: Readonly<TState>, _event: TEvent): [TState, TEvent[]] => {
    return [state as TState, []];
  };
}
