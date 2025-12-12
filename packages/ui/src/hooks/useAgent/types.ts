/**
 * Types for useAgent hook
 *
 * Conversation-first design: directly produces ConversationData for UI rendering.
 */

import type { Message, AgentState, ToolCallMessage, ToolResultMessage } from "agentxjs";
import type {
  ConversationData,
  UserConversationData,
  AssistantConversationData,
  ErrorConversationData,
  ToolBlockData,
  UserConversationStatus,
  AssistantConversationStatus,
} from "~/components/entry/types";

// Re-export conversation types for convenience
export type {
  ConversationData,
  UserConversationData,
  AssistantConversationData,
  ErrorConversationData,
  ToolBlockData,
  UserConversationStatus,
  AssistantConversationStatus,
};

// ============================================================================
// Status Types
// ============================================================================

/**
 * Agent status - use AgentState from agentxjs
 */
export type AgentStatus = AgentState;

// ============================================================================
// Conversation State
// ============================================================================

/**
 * Conversation state managed by reducer
 *
 * ID Design:
 * - conversation.id: frontend instance ID, never changes (used for React key, internal tracking)
 * - conversation.messageIds: backend message IDs, accumulated from message_start events
 */
export interface ConversationState {
  /** Ordered list of conversations */
  conversations: ConversationData[];

  /** Set of conversation IDs for deduplication */
  conversationIds: Set<string>;

  /** Map of toolCallId -> parent conversation id for pairing tool results */
  pendingToolCalls: Map<string, string>;

  /** Current streaming assistant conversation id (if any) */
  streamingConversationId: string | null;

  /** Accumulated streaming text */
  streamingText: string;

  /** Errors */
  errors: UIError[];

  /** Agent status */
  agentStatus: AgentStatus;
}

/**
 * Actions for conversation reducer
 */
export type ConversationAction =
  | { type: "LOAD_HISTORY"; messages: Message[] }
  | { type: "RESET" }
  // User conversation actions
  | { type: "USER_CONVERSATION_ADD"; conversation: UserConversationData }
  | { type: "USER_CONVERSATION_STATUS"; status: UserConversationStatus; errorCode?: string }
  // Assistant conversation actions
  | { type: "ASSISTANT_CONVERSATION_START"; id: string }
  | { type: "ASSISTANT_CONVERSATION_STATUS"; status: AssistantConversationStatus }
  | { type: "ASSISTANT_CONVERSATION_TEXT_DELTA"; text: string }
  | { type: "ASSISTANT_CONVERSATION_MESSAGE_START"; messageId: string }
  | { type: "ASSISTANT_CONVERSATION_CONTENT"; message: Message }
  | { type: "ASSISTANT_CONVERSATION_FINISH" }
  // Tool block actions
  | { type: "TOOL_BLOCK_ADD"; message: ToolCallMessage }
  | { type: "TOOL_BLOCK_RESULT"; message: ToolResultMessage }
  // Error actions
  | { type: "ERROR_CONVERSATION_ADD"; message: Message }
  | { type: "ERROR_ADD"; error: UIError }
  | { type: "ERRORS_CLEAR" }
  // Agent status
  | { type: "AGENT_STATUS"; status: AgentStatus };

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error info for UI
 */
export interface UIError {
  code: string;
  message: string;
  recoverable: boolean;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Return type of useAgent hook
 */
export interface UseAgentResult {
  /** All conversations (user, assistant, error) */
  conversations: ConversationData[];

  /** Current streaming text (for streaming assistant conversation) */
  streamingText: string;

  /** Agent status */
  status: AgentStatus;

  /** Errors */
  errors: UIError[];

  /** Send a message */
  send: (text: string) => void;

  /** Interrupt current response */
  interrupt: () => void;

  /** Whether agent is processing */
  isLoading: boolean;

  /** Clear all conversations */
  clearConversations: () => void;

  /** Clear all errors */
  clearErrors: () => void;

  /** Current agent ID */
  agentId: string | null;
}

/**
 * Options for useAgent hook
 */
export interface UseAgentOptions {
  onSend?: (text: string) => void;
  onError?: (error: UIError) => void;
  onStatusChange?: (status: AgentStatus) => void;
}
