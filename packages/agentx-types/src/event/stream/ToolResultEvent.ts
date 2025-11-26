import type { StreamEvent } from "./StreamEvent";

/**
 * ToolResultEvent
 *
 * Emitted when a tool execution result is received from Claude SDK.
 * This contains the actual output of tool execution.
 */
export interface ToolResultEvent extends StreamEvent {
  type: "tool_result";
  data: {
    /**
     * Tool call ID this result corresponds to
     */
    toolId: string;

    /**
     * Tool result content (can be string or array of content blocks)
     */
    content: string | any[];

    /**
     * Whether this is an error result
     */
    isError?: boolean;
  };
}
