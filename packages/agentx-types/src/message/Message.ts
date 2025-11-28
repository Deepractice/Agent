import type { UserMessage } from "./UserMessage";
import type { AssistantMessage } from "./AssistantMessage";
import type { SystemMessage } from "./SystemMessage";
import type { ToolCallMessage } from "./ToolCallMessage";
import type { ToolResultMessage } from "./ToolResultMessage";
import type { ErrorMessage } from "./ErrorMessage";

/**
 * Message Subtype
 *
 * Represents the specific type/category of the message.
 * Used together with role for serialization and type discrimination.
 */
export type MessageSubtype =
  | "user"
  | "assistant"
  | "tool-call"
  | "tool-result"
  | "system"
  | "error";

/**
 * Message
 *
 * Discriminated union of all message types.
 * Use `subtype` field for precise type discrimination.
 *
 * Role: Who sent it (user, assistant, tool, system)
 * Subtype: What type of message (user, assistant, tool-call, tool-result, system, error)
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
 *     case "error":
 *       console.error(msg.error.message);
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
  | ToolResultMessage
  | ErrorMessage;
