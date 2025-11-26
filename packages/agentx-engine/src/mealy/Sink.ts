/**
 * Sink - Output adapter for Mealy Machine
 *
 * A Sink receives outputs from Processors and produces external effects.
 * This is a pure function type - lifecycle management belongs to higher layers.
 *
 * Pattern: (id, outputs) => void | Promise<void>
 *
 * @template TOutput - The output type received from Processors
 *
 * @example
 * ```typescript
 * // Sync sink (logging)
 * const logSink: Sink<AgentEvent> = (id, outputs) => {
 *   outputs.forEach(output => console.log(`[${id}]`, output));
 * };
 *
 * // Async sink (network)
 * const sseSink: Sink<AgentEvent> = async (id, outputs) => {
 *   for (const output of outputs) {
 *     await sseConnection.send(id, output);
 *   }
 * };
 * ```
 */
export type Sink<TOutput> = (id: string, outputs: TOutput[]) => void | Promise<void>;

/**
 * SinkDefinition - Named Sink with metadata
 *
 * Use this when you need to identify sinks by name.
 */
export interface SinkDefinition<TOutput> {
  /**
   * Unique name for this sink
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Optional filter to select which outputs to process
   *
   * If not provided, all outputs are processed.
   * Return true to process the output, false to skip.
   */
  filter?: (output: TOutput) => boolean;

  /**
   * The sink function
   */
  sink: Sink<TOutput>;
}
