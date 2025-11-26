/**
 * Token Usage
 *
 * Tracks token consumption for AI messages.
 */
export interface TokenUsage {
  /** Input tokens used */
  input: number;

  /** Output tokens generated */
  output: number;

  /** Tokens read from cache (optional) */
  cacheRead?: number;

  /** Tokens written to cache (optional) */
  cacheWrite?: number;
}
