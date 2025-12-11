/**
 * Types for useAgent hook
 *
 * Entry-first design: directly produces EntryData for UI rendering.
 */

import type { Message, AgentState, ToolCallMessage, ToolResultMessage } from "agentxjs";
import type {
  EntryData,
  UserEntryData,
  AssistantEntryData,
  ErrorEntryData,
  ToolBlockData,
  UserEntryStatus,
  AssistantEntryStatus,
} from "~/components/entry/types";

// Re-export entry types for convenience
export type {
  EntryData,
  UserEntryData,
  AssistantEntryData,
  ErrorEntryData,
  ToolBlockData,
  UserEntryStatus,
  AssistantEntryStatus,
};

// ============================================================================
// Status Types
// ============================================================================

/**
 * Agent status - use AgentState from agentxjs
 */
export type AgentStatus = AgentState;

// ============================================================================
// Entry State
// ============================================================================

/**
 * Entry state managed by reducer
 *
 * ID Design:
 * - entry.id: frontend instance ID, never changes (used for React key, internal tracking)
 * - entry.messageId: backend message ID, set on message_start (used for tool_call association)
 */
export interface EntryState {
  /** Ordered list of entries */
  entries: EntryData[];

  /** Set of entry IDs for deduplication */
  entryIds: Set<string>;

  /** Map of toolCallId -> parent entry id for pairing tool results */
  pendingToolCalls: Map<string, string>;

  /** Current streaming assistant entry id (if any) */
  streamingEntryId: string | null;

  /** Accumulated streaming text */
  streamingText: string;

  /** Errors */
  errors: UIError[];

  /** Agent status */
  agentStatus: AgentStatus;
}

/**
 * Actions for entry reducer
 */
export type EntryAction =
  | { type: "LOAD_HISTORY"; messages: Message[] }
  | { type: "RESET" }
  // User entry actions
  | { type: "USER_ENTRY_ADD"; entry: UserEntryData }
  | { type: "USER_ENTRY_STATUS"; status: UserEntryStatus; errorCode?: string }
  // Assistant entry actions
  | { type: "ASSISTANT_ENTRY_START"; id: string }
  | { type: "ASSISTANT_ENTRY_STATUS"; status: AssistantEntryStatus }
  | { type: "ASSISTANT_ENTRY_TEXT_DELTA"; text: string }
  | { type: "ASSISTANT_ENTRY_MESSAGE_START"; messageId: string }
  | { type: "ASSISTANT_ENTRY_COMPLETE"; message: Message }
  // Tool block actions
  | { type: "TOOL_BLOCK_ADD"; message: ToolCallMessage }
  | { type: "TOOL_BLOCK_RESULT"; message: ToolResultMessage }
  // Error actions
  | { type: "ERROR_ENTRY_ADD"; message: Message }
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
  /** All entries (user, assistant, error) */
  entries: EntryData[];

  /** Current streaming text (for streaming assistant entry) */
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

  /** Clear all entries */
  clearEntries: () => void;

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
