/**
 * Message Types
 *
 * Role-based message system with rich, multi-modal content support.
 */

// Core message types
export type { Message } from "./Message";
export type { UserMessage } from "./UserMessage";
export type { AssistantMessage } from "./AssistantMessage";
export type { SystemMessage } from "./SystemMessage";
export type { ToolUseMessage } from "./ToolUseMessage";
export type { ErrorMessage, ErrorSubtype, ErrorSeverity } from "./ErrorMessage";

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
