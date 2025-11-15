import type { ToolResultPart } from "./parts/ToolResultPart";

/**
 * Tool Message
 *
 * Message containing tool execution results.
 * Always contains an array of tool result parts.
 */
export interface ToolMessage {
  /** Unique identifier */
  id: string;

  /** Message role */
  role: "tool";

  /** Tool execution results */
  content: ToolResultPart[];

  /** When this message was created (Unix timestamp in milliseconds) */
  timestamp: number;

  /** Parent message ID (usually the assistant message that requested the tool) */
  parentId?: string;
}
