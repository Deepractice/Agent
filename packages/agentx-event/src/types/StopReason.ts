/**
 * Stop Reason Types
 *
 * Defines why a Claude message stopped generating.
 * Based on Anthropic's official API specification.
 */

/**
 * Reason why the Claude message stopped
 *
 * @see https://docs.anthropic.com/en/api/messages-streaming
 */
export type StopReason =
  /**
   * Natural conversation end - the model completed its response
   * This indicates the exchange is complete (no more tool calls needed)
   */
  | "end_turn"
  /**
   * Model wants to use a tool
   * More messages will follow after tool execution
   */
  | "tool_use"
  /**
   * Reached maximum token limit
   */
  | "max_tokens"
  /**
   * Encountered a custom stop sequence
   * The actual sequence is in stopSequence field
   */
  | "stop_sequence";

/**
 * Type guard to check if a string is a valid StopReason
 */
export function isStopReason(value: string): value is StopReason {
  return ["end_turn", "tool_use", "max_tokens", "stop_sequence"].includes(value);
}
