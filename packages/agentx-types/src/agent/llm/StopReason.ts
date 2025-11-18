/**
 * Reason why the LLM stopped generating
 *
 * Based on common stop reasons across multiple LLM providers:
 * - Anthropic Claude: end_turn, max_tokens, tool_use
 * - OpenAI: stop, length, tool_calls, content_filter
 * - Vercel AI SDK: stop, length, tool-calls, content-filter, error, other
 */
export type StopReason =
  /**
   * Natural completion - model decided to stop
   */
  | "end_turn"

  /**
   * Reached maximum token limit
   */
  | "max_tokens"

  /**
   * Model requested tool usage
   */
  | "tool_use"

  /**
   * Content filter triggered
   */
  | "content_filter"

  /**
   * Error occurred during generation
   */
  | "error"

  /**
   * Other/unknown reason
   */
  | "other";
