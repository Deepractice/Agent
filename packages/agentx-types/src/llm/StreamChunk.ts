/**
 * Streaming output chunk types
 *
 * When LLM generates responses in streaming mode, it emits chunks of different types.
 * This allows real-time display of the generation process.
 */

/**
 * Text content chunk
 */
export interface TextChunk {
  type: "text";
  /**
   * Text delta (incremental content)
   */
  delta: string;
  /**
   * Cumulative index of this chunk
   */
  index: number;
}

/**
 * Thinking process chunk (for models with extended thinking)
 */
export interface ThinkingChunk {
  type: "thinking";
  /**
   * Thinking delta (incremental reasoning)
   */
  delta: string;
  /**
   * Cumulative index of this chunk
   */
  index: number;
}

/**
 * Tool use chunk (when model requests tool usage)
 */
export interface ToolUseChunk {
  type: "tool-use";
  /**
   * Tool name
   */
  name: string;
  /**
   * Tool call ID
   */
  id: string;
  /**
   * Partial input (may be incomplete JSON)
   */
  inputDelta?: string;
}

/**
 * Union type of all streaming chunks
 */
export type StreamChunk = TextChunk | ThinkingChunk | ToolUseChunk;
