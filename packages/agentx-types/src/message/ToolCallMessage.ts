/**
 * Tool Call Message
 *
 * Represents AI's request to invoke a tool.
 * Emitted when tool call parameters are fully assembled.
 *
 * Subject: Assistant (AI decided to call a tool)
 * Timing: At tool_use_content_block_stop
 */

import type { ToolCallPart } from "./parts/ToolCallPart";

/**
 * Tool Call Message
 */
export interface ToolCallMessage {
  /** Unique message identifier */
  id: string;

  /** Message role - assistant initiates tool calls */
  role: "assistant";

  /** Message subtype for serialization */
  subtype: "tool-call";

  /** Tool call details */
  toolCall: ToolCallPart;

  /** When this message was created (Unix timestamp in milliseconds) */
  timestamp: number;

  /** Parent message ID (the assistant message that triggered this) */
  parentId?: string;
}
