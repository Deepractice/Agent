/**
 * Message Types
 *
 * Role-based message system with rich, multi-modal content support.
 *
 * ## Design Decision: Role + Subtype Discrimination
 *
 * Messages use two discriminators:
 * - `role`: WHO sent it (user, assistant, tool, system)
 * - `subtype`: WHAT TYPE of message (user, assistant, tool-call, tool-result, system)
 *
 * Why two fields?
 * 1. `role` is semantic - indicates the participant in conversation
 * 2. `subtype` is structural - enables precise type narrowing
 * 3. Same role can have different subtypes (assistant → assistant | tool-call)
 *
 * ```typescript
 * // Both have role: "assistant" but different structure
 * AssistantMessage  // subtype: "assistant" - text/thinking content
 * ToolCallMessage   // subtype: "tool-call" - tool invocation request
 * ```
 *
 * ## Design Decision: Content as string | ContentPart[]
 *
 * Simple messages use string, complex messages use ContentPart[]:
 *
 * ```typescript
 * // Simple
 * { content: "Hello!" }
 *
 * // Multi-modal
 * { content: [
 *   { type: "text", text: "Look at this:" },
 *   { type: "image", data: "base64...", mediaType: "image/png" }
 * ]}
 * ```
 *
 * This avoids wrapping simple strings in arrays while supporting rich content.
 *
 * ## Design Decision: Error is NOT a Message
 *
 * Previously we had ErrorMessage in the Message union. This was removed because:
 * 1. Errors are system notifications, not conversation content
 * 2. Errors need special SSE transport handling
 * 3. Error UI rendering differs from message rendering
 *
 * Errors now use independent ErrorEvent (see ~/event/error).
 */

// Core message types
export type { Message, MessageSubtype } from "./Message";
export type { UserMessage } from "./UserMessage";
export type { AssistantMessage } from "./AssistantMessage";
export type { SystemMessage } from "./SystemMessage";
export type { ToolCallMessage } from "./ToolCallMessage";
export type { ToolResultMessage } from "./ToolResultMessage";

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
