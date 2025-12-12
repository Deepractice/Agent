/**
 * Conversation Components
 *
 * Conversation-first design for chat UI rendering.
 * Conversation = one party's complete utterance in a turn.
 * Block = component within a Conversation.
 */

// Types
export type {
  ConversationData,
  UserConversationData,
  AssistantConversationData,
  ErrorConversationData,
  ToolBlockData,
  UserConversationStatus,
  AssistantConversationStatus,
  ToolBlockStatus,
} from "./types";

export { isUserConversation, isAssistantConversation, isErrorConversation } from "./types";

// Conversation components (keep old names for now, will rename files later)
export { UserEntry, type UserEntryProps } from "./UserEntry";
export { AssistantEntry, type AssistantEntryProps } from "./AssistantEntry";
export { ErrorEntry, type ErrorEntryProps } from "./ErrorEntry";

// Block components
export { ToolBlock, type ToolBlockProps } from "./blocks";
