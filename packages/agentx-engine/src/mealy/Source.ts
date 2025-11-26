/**
 * Source - Input adapter for Mealy Machine
 *
 * A Source transforms external requests into internal events.
 * This is a pure function type - lifecycle management belongs to higher layers.
 *
 * Pattern: (request) => AsyncIterable<input>
 *
 * @template TInput - The event type produced for Processors
 * @template TRequest - The request type received from external (default: void)
 *
 * @example
 * ```typescript
 * // Simple source (no request)
 * const timerSource: Source<TimerEvent> = async function* () {
 *   while (true) {
 *     yield { type: 'tick', timestamp: Date.now() };
 *     await sleep(1000);
 *   }
 * };
 *
 * // Source with request
 * const apiSource: Source<ApiEvent, ApiRequest> = async function* (request) {
 *   const response = await fetch(request.url);
 *   yield { type: 'response', data: await response.json() };
 * };
 * ```
 */
export type Source<TInput, TRequest = void> = (request: TRequest) => AsyncIterable<TInput>;

/**
 * SourceDefinition - Named Source with metadata
 *
 * Use this when you need to identify sources by name.
 */
export interface SourceDefinition<TInput, TRequest = void> {
  /**
   * Unique name for this source
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * The source function
   */
  source: Source<TInput, TRequest>;
}
