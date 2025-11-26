/**
 * Tool Use Message
 *
 * Represents a complete tool usage record.
 * This message is created AFTER the tool execution completes.
 *
 * Philosophy:
 * - Pure data structure, no runtime state
 * - From user's view, tool use is ONE complete behavior (call + result)
 * - Uses ToolCallPart and ToolResultPart from parts
 * - Lifecycle/status tracking belongs in State events, not data
 */

import type { ToolCallPart } from "./parts/ToolCallPart";
import type { ToolResultPart } from "./parts/ToolResultPart";

/**
 * Tool Use Message
 *
 * A complete record of tool usage including both the call and result.
 */
export interface ToolUseMessage {
  /** Unique message identifier */
  id: string;

  /** Message role */
  role: "tool-use";

  /** Tool call */
  toolCall: ToolCallPart;

  /** Tool execution result */
  toolResult: ToolResultPart;

  /** When this message was created (Unix timestamp in milliseconds) */
  timestamp: number;

  /** Parent message ID (typically the assistant message that triggered this) */
  parentId?: string;
}
