import type { Message } from "~/agent/message/Message";
import type { UserMessage } from "~/agent/message/UserMessage";
import type { AssistantMessage } from "~/agent/message/AssistantMessage";
import type { SystemMessage } from "~/agent/message/SystemMessage";
import type { ToolUseMessage } from "~/agent/message/ToolUseMessage";
import type { ErrorMessage } from "~/agent/message/ErrorMessage";

/**
 * Type guard for UserMessage
 */
export function isUserMessage(message: Message): message is UserMessage {
  return message.role === "user";
}

/**
 * Type guard for AssistantMessage
 */
export function isAssistantMessage(message: Message): message is AssistantMessage {
  return message.role === "assistant";
}

/**
 * Type guard for SystemMessage
 */
export function isSystemMessage(message: Message): message is SystemMessage {
  return message.role === "system";
}

/**
 * Type guard for ToolUseMessage
 */
export function isToolUseMessage(message: Message): message is ToolUseMessage {
  return message.role === "tool-use";
}

/**
 * Type guard for ErrorMessage
 */
export function isErrorMessage(message: Message): message is ErrorMessage {
  return message.role === "error";
}
