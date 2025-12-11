/**
 * Entry Components
 *
 * Entry-first design for chat UI rendering.
 * Entry = one party's complete utterance in conversation.
 * Block = component within an Entry.
 */

// Types
export type {
  EntryData,
  UserEntryData,
  AssistantEntryData,
  ErrorEntryData,
  ToolBlockData,
  UserEntryStatus,
  AssistantEntryStatus,
  ToolBlockStatus,
} from "./types";

export { isUserEntry, isAssistantEntry, isErrorEntry } from "./types";

// Entry components
export { UserEntry, type UserEntryProps } from "./UserEntry";
export { AssistantEntry, type AssistantEntryProps } from "./AssistantEntry";
export { ErrorEntry, type ErrorEntryProps } from "./ErrorEntry";

// Block components
export { ToolBlock, type ToolBlockProps } from "./blocks";
