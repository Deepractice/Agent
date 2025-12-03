import type { UserMessage } from "./UserMessage";
import type { AssistantMessage } from "./AssistantMessage";
import type { SystemMessage } from "./SystemMessage";
import type { ToolCallMessage } from "./ToolCallMessage";
import type { ToolResultMessage } from "./ToolResultMessage";

/**
 * Message Subtype
 *
 * Represents the specific type/category of the message.
 * Used together with role for serialization and type discrimination.
 *
 * Note: "error" has been removed. Errors are now handled via independent
 * ErrorEvent (see ~/event/error) which is transportable via SSE.
 */
export type MessageSubtype = "user" | "assistant" | "tool-call" | "tool-result" | "system";

/**
 * Message
 *
 * Discriminated union of all message types.
 * Use `subtype` field for precise type discrimination.
 *
 * Role: Who sent it (user, assistant, tool, system)
 * Subtype: What type of message (user, assistant, tool-call, tool-result, system)
 *
 * Note: Error messages are no longer part of Message union.
 * Errors are handled via independent ErrorEvent for SSE transport.
 *
 * @example
 * ```typescript
 * function handleMessage(msg: Message) {
 *   switch (msg.subtype) {
 *     case "user":
 *       console.log(msg.content);
 *       break;
 *     case "assistant":
 *       console.log(msg.content);
 *       break;
 *     case "tool-call":
 *       console.log(msg.toolCall.name);
 *       break;
 *     case "tool-result":
 *       console.log(msg.toolResult.output);
 *       break;
 *   }
 * }
 * ```
 */
export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolCallMessage
  | ToolResultMessage;
