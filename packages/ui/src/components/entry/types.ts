/**
 * Entry Types
 *
 * Entry-first design for chat UI rendering.
 * Entry = one party's complete utterance in conversation.
 * Block = component within an Entry (e.g., ToolBlock inside AssistantEntry).
 *
 * Data flow:
 * Message (backend) → Entry (UI layer) → Block (sub-components)
 */

// ============================================================================
// Block Types (子组件)
// ============================================================================

/**
 * Tool block status
 */
export type ToolBlockStatus = "executing" | "success" | "error";

/**
 * Tool block data - embedded in AssistantEntry
 */
export interface ToolBlockData {
  /** Tool call message id */
  id: string;
  /** Tool call id (for matching result) */
  toolCallId: string;
  /** Tool name */
  name: string;
  /** Tool input parameters */
  input: unknown;
  /** Execution status */
  status: ToolBlockStatus;
  /** Tool output (when completed) */
  output?: unknown;
  /** Start time in milliseconds (for duration calculation) */
  startTime?: number;
  /** Execution duration in seconds */
  duration?: number;
}

// ============================================================================
// Entry Types (主组件)
// ============================================================================

/**
 * User entry status
 */
export type UserEntryStatus = "pending" | "success" | "error" | "interrupted";

/**
 * User entry data - user's message
 */
export interface UserEntryData {
  type: "user";
  /** Entry id */
  id: string;
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Send status */
  status: UserEntryStatus;
  /** Error code (if status is error) */
  errorCode?: string;
}

/**
 * Assistant entry status (4-state lifecycle)
 * - queued: waiting for AI to start processing
 * - thinking: AI is processing but not yet outputting
 * - streaming: AI is outputting text
 * - completed: AI finished responding
 */
export type AssistantEntryStatus = "queued" | "thinking" | "streaming" | "completed";

/**
 * Assistant entry data - AI's response with embedded tool blocks
 */
export interface AssistantEntryData {
  type: "assistant";
  /** Entry id - frontend instance ID, never changes once created */
  id: string;
  /** Backend message id - set when message_start received, used for tool_call association */
  messageId?: string;
  /** Text content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Response status */
  status: AssistantEntryStatus;
  /** Embedded tool blocks */
  blocks: ToolBlockData[];
}

/**
 * Error entry data - error message
 */
export interface ErrorEntryData {
  type: "error";
  /** Entry id */
  id: string;
  /** Error message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Error code */
  errorCode?: string;
}

/**
 * Union type for all entries
 */
export type EntryData = UserEntryData | AssistantEntryData | ErrorEntryData;

// ============================================================================
// Type Guards
// ============================================================================

export function isUserEntry(entry: EntryData): entry is UserEntryData {
  return entry.type === "user";
}

export function isAssistantEntry(entry: EntryData): entry is AssistantEntryData {
  return entry.type === "assistant";
}

export function isErrorEntry(entry: EntryData): entry is ErrorEntryData {
  return entry.type === "error";
}
