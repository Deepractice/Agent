/**
 * Types for useAgent hook
 */

import type { Message, AgentState } from "agentxjs";

/**
 * Agent status - use AgentState from agentxjs
 */
export type AgentStatus = AgentState;

/**
 * Status for user messages
 */
export type UserMessageStatus = "pending" | "success" | "error" | "interrupted";

/**
 * Status for assistant messages
 */
export type AssistantMessageStatus = "queued" | "thinking" | "responding" | "success";

/**
 * Combined message status type
 */
export type MessageStatus = UserMessageStatus | AssistantMessageStatus;

/**
 * UI-specific metadata for messages
 */
export interface UIMessageMetadata {
  /** Status for messages */
  status?: MessageStatus;
  /** Error code if status is error */
  errorCode?: string;
  /** Timestamp when status changed */
  statusChangedAt?: number;
}

/**
 * Message for UI display
 *
 * Intersection of Message with optional UI-specific metadata.
 */
export type UIMessage = Message & {
  metadata?: UIMessageMetadata;
};

/**
 * Error info for UI
 */
export interface UIError {
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * Return type of useAgent hook
 */
export interface UseAgentResult {
  /**
   * All messages in the conversation
   */
  messages: UIMessage[];

  /**
   * Current streaming text (accumulates during response)
   */
  streaming: string;

  /**
   * Current agent status
   */
  status: AgentStatus;

  /**
   * Errors received
   */
  errors: UIError[];

  /**
   * Send a message to the agent
   */
  send: (text: string) => void;

  /**
   * Interrupt the current response
   */
  interrupt: () => void;

  /**
   * Whether the agent is currently processing
   */
  isLoading: boolean;

  /**
   * Clear all messages
   */
  clearMessages: () => void;

  /**
   * Clear all errors
   */
  clearErrors: () => void;

  /**
   * Current agent ID (if running)
   */
  agentId: string | null;
}

/**
 * Options for useAgent hook
 */
export interface UseAgentOptions {
  /**
   * Callback when a message is sent
   */
  onSend?: (text: string) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: UIError) => void;

  /**
   * Callback when status changes
   */
  onStatusChange?: (status: AgentStatus) => void;
}

/**
 * Legacy support - keep AgentIdentifier type for backwards compatibility
 */
export type AgentIdentifier = {
  imageId?: string;
};
