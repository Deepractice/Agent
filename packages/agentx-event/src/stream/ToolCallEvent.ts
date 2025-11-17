import type { StreamEvent } from "./StreamEvent";

/**
 * ToolCallEvent
 *
 * Emitted when a complete tool call has been assembled from stream deltas.
 * This is a high-level event indicating tool use is ready for execution.
 */
export interface ToolCallEvent extends StreamEvent {
  type: "tool_call";
  data: {
    /**
     * Tool call ID
     */
    id: string;

    /**
     * Tool name
     */
    name: string;

    /**
     * Tool input (parsed from JSON)
     */
    input: any;
  };
}
