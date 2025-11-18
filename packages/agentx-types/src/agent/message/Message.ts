import type { UserMessage } from "./UserMessage";
import type { AssistantMessage } from "./AssistantMessage";
import type { SystemMessage } from "./SystemMessage";
import type { ToolUseMessage } from "./ToolUseMessage";
import type { ErrorMessage } from "./ErrorMessage";

/**
 * Message
 *
 * Discriminated union of all message types based on role.
 * Use the `role` field to determine the actual message type.
 *
 * @example
 * ```typescript
 * function handleMessage(msg: Message) {
 *   if (msg.role === "user") {
 *     // TypeScript knows msg is UserMessage
 *     const content = msg.content  // string | Part[]
 *   } else if (msg.role === "tool-use") {
 *     // TypeScript knows msg is ToolUseMessage
 *     console.log(msg.toolCall.name, msg.status)
 *   } else if (msg.role === "error") {
 *     // TypeScript knows msg is ErrorMessage
 *     console.error(msg.message, msg.stack)
 *   }
 * }
 * ```
 */
export type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ToolUseMessage
  | ErrorMessage;
