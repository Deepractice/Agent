import type { Message } from "~/agent/message/Message";
import type { UserMessage } from "~/agent/message/UserMessage";
import type { AssistantMessage } from "~/agent/message/AssistantMessage";
import type { SystemMessage } from "~/agent/message/SystemMessage";
import type { ToolCallMessage } from "~/agent/message/ToolCallMessage";
import type { ToolResultMessage } from "~/agent/message/ToolResultMessage";

/**
 * Type guard for UserMessage
 */
export function isUserMessage(message: Message): message is UserMessage {
  return message.subtype === "user";
}

/**
 * Type guard for AssistantMessage (text response, not tool call)
 */
export function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.subtype === "assistant";
}

/**
 * Type guard for SystemMessage
 */
export function isSystemMessage(message: Message): message is SystemMessage {
  return message.subtype === "system";
}

/**
 * Type guard for ToolCallMessage
 */
export function isToolCallMessage(message: Message): message is ToolCallMessage {
  return message.subtype === "tool-call";
}

/**
 * Type guard for ToolResultMessage
 */
export function isToolResultMessage(message: Message): message is ToolResultMessage {
  return message.subtype === "tool-result";
}
