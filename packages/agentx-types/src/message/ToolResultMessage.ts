/**
 * Tool Result Message
 *
 * Represents the result of tool execution.
 * Emitted after tool execution completes.
 *
 * Subject: Tool (execution completed with result)
 * Timing: At tool_result event
 */

import type { ToolResultPart } from "./parts/ToolResultPart";

/**
 * Tool Result Message
 */
export interface ToolResultMessage {
  /** Unique message identifier */
  id: string;

  /** Message role - tool returns results */
  role: "tool";

  /** Message subtype for serialization */
  subtype: "tool-result";

  /** Tool result details */
  toolResult: ToolResultPart;

  /** ID of the corresponding tool call */
  toolCallId: string;

  /** When this message was created (Unix timestamp in milliseconds) */
  timestamp: number;
}
