/**
 * Conversation Types
 *
 * Conversation-first design for chat UI rendering.
 * Conversation = one party's complete utterance in a turn.
 * Block = component within a Conversation (e.g., ToolBlock inside AssistantConversation).
 *
 * Data flow:
 * Message (backend) → Conversation (UI layer) → Block (sub-components)
 *
 * Terminology:
 * - Turn = UserConversation + AssistantConversation
 * - AssistantConversation may contain multiple backend messages (due to tool calls)
 */

// ============================================================================
// Block Types (子组件)
// ============================================================================

/**
 * Tool block status
 */
export type ToolBlockStatus = "executing" | "success" | "error";

/**
 * Tool block data - embedded in AssistantConversation
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
// Conversation Types (主组件)
// ============================================================================

/**
 * User conversation status
 */
export type UserConversationStatus = "pending" | "success" | "error" | "interrupted";

/**
 * User conversation data - user's message
 */
export interface UserConversationData {
  type: "user";
  /** Conversation id */
  id: string;
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Send status */
  status: UserConversationStatus;
  /** Error code (if status is error) */
  errorCode?: string;
}

/**
 * Assistant conversation status (5-state lifecycle)
 * - queued: user sent message, waiting for backend to receive
 * - processing: backend received, preparing to process (conversation_start)
 * - thinking: AI is thinking (conversation_thinking)
 * - streaming: AI is outputting text (conversation_responding / text_delta)
 * - completed: AI finished responding (conversation_end)
 */
export type AssistantConversationStatus =
  | "queued"
  | "processing"
  | "thinking"
  | "streaming"
  | "completed";

/**
 * Assistant conversation data - AI's response with embedded tool blocks
 * One AssistantConversation may contain multiple backend messages (due to tool call loops)
 */
export interface AssistantConversationData {
  type: "assistant";
  /** Conversation id - frontend instance ID, never changes once created */
  id: string;
  /** Backend message ids - accumulated from multiple message_start events */
  messageIds: string[];
  /** Text content - accumulated from multiple assistant_message events */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Response status */
  status: AssistantConversationStatus;
  /** Embedded tool blocks */
  blocks: ToolBlockData[];
}

/**
 * Error conversation data - error message
 */
export interface ErrorConversationData {
  type: "error";
  /** Conversation id */
  id: string;
  /** Error message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Error code */
  errorCode?: string;
}

/**
 * Union type for all conversations
 */
export type ConversationData =
  | UserConversationData
  | AssistantConversationData
  | ErrorConversationData;

// ============================================================================
// Type Guards
// ============================================================================

export function isUserConversation(
  conversation: ConversationData
): conversation is UserConversationData {
  return conversation.type === "user";
}

export function isAssistantConversation(
  conversation: ConversationData
): conversation is AssistantConversationData {
  return conversation.type === "assistant";
}

export function isErrorConversation(
  conversation: ConversationData
): conversation is ErrorConversationData {
  return conversation.type === "error";
}
