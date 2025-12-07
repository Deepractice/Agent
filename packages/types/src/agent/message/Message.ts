import type { UserMessage } from "./UserMessage";
import type { AssistantMessage } from "./AssistantMessage";
import type { ToolCallMessage } from "./ToolCallMessage";
import type { ToolResultMessage } from "./ToolResultMessage";
import type { ErrorMessage } from "./ErrorMessage";

/**
 * Message Subtype
 *
 * Represents the specific type/category of the message.
 * Used together with role for serialization and type discrimination.
 */
export type MessageSubtype = "user" | "assistant" | "tool-call" | "tool-result" | "error";

/**
 * Message
 *
 * Discriminated union of all message types.
 * Use `subtype` field for precise type discrimination.
 *
 * Role: Who sent it (user, assistant, tool, system, error)
 * Subtype: What type of message (user, assistant, tool-call, tool-result, error)
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
 *       console.log(msg.content);
 *       break;
 *   }
 * }
 * ```
 */
export type Message =
  | UserMessage
  | AssistantMessage
  | ToolCallMessage
  | ToolResultMessage
  | ErrorMessage;
