export { Chat } from "./Chat";
export type { ChatProps } from "./Chat";

export { ChatMessageList } from "./ChatMessageList";
export type { ChatMessageListProps } from "./ChatMessageList";

export { ChatInput } from "./ChatInput";
export type { ChatInputProps } from "./ChatInput";

// Re-export message components
export {
  UserMessage,
  AssistantMessage,
  ToolUseMessage,
  SystemMessage,
  ErrorMessage,
} from "./messages";

export type {
  UserMessageProps,
  AssistantMessageProps,
  ToolUseMessageProps,
  SystemMessageProps,
  ErrorMessageProps,
} from "./messages";

// Re-export Message type from agentx-types
export type { Message } from "@deepractice-ai/agentx-types";
