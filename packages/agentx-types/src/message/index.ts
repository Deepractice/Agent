/**
 * Message Types
 *
 * Role-based message system with rich, multi-modal content support.
 *
 * Role: Who sent the message (user, assistant, tool, system)
 * Subtype: Message category for serialization
 */

// Core message types
export type { Message, MessageSubtype } from "./Message";
export type { UserMessage } from "./UserMessage";
export type { AssistantMessage } from "./AssistantMessage";
export type { SystemMessage } from "./SystemMessage";
export type { ToolCallMessage } from "./ToolCallMessage";
export type { ToolResultMessage } from "./ToolResultMessage";
export type { ErrorMessage } from "./ErrorMessage";

// Message metadata
export type { MessageRole } from "./MessageRole";

// Content parts
export type {
  ContentPart,
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  ToolResultOutput,
} from "./parts";
