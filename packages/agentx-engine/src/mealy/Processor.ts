/**
 * Processor - Core pure function type for stream processing
 *
 * A Processor is a pure function that takes a state and an input,
 * and returns a new state along with outputs.
 *
 * Pattern: (state, input) => [newState, outputs]
 *
 * Key properties:
 * - Pure function (no side effects)
 * - Deterministic (same input → same output)
 * - State is a means (accumulator), outputs are the goal
 *
 * @template TState - The state type (internal accumulator)
 * @template TInput - The input type
 * @template TOutput - The output type (emissions)
 *
 * @example
 * ```typescript
 * const messageProcessor: Processor<MsgState, StreamEvent, MsgEvent> =
 *   (state, input) => {
 *     switch (input.type) {
 *       case 'text_delta':
 *         return [{ ...state, buffer: state.buffer + input.data.text }, []];
 *       case 'message_stop':
 *         return [{ buffer: '' }, [{ type: 'assistant_message', content: state.buffer }]];
 *       default:
 *         return [state, []];
 *     }
 *   };
 * ```
 */
export type Processor<TState, TInput, TOutput> = (
  state: Readonly<TState>,
  input: TInput
) => [TState, TOutput[]];

/**
 * ProcessorResult - The return type of a Processor
 *
 * A tuple containing:
 * - [0] newState: The updated state after processing
 * - [1] outputs: Array of outputs to emit
 */
export type ProcessorResult<TState, TOutput> = [TState, TOutput[]];

/**
 * ProcessorDefinition - Metadata for a Processor
 */
export interface ProcessorDefinition<TState, TInput, TOutput> {
  /**
   * Unique name for this processor
   */
  name: string;

  /**
   * The pure processor function
   */
  processor: Processor<TState, TInput, TOutput>;

  /**
   * Initial state factory
   */
  initialState: () => TState;

  /**
   * Optional description
   */
  description?: string;
}
