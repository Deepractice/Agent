/**
 * ChatReactor - Reactor for Chat component
 *
 * Handles all agent events and updates React state
 */

import { defineReactor } from "@deepractice-ai/agentx-framework";
import type {
  TextDeltaEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ToolResultEvent,
  ConversationStartStateEvent,
  ConversationEndStateEvent,
  TurnResponseEvent,
  ErrorMessageEvent,
  Message,
  ErrorMessage as ErrorMessageType,
} from "@deepractice-ai/agentx-framework";

export interface ChatReactorConfig {
  setStreaming: (update: (prev: string) => string) => void;
  setMessages: (update: (prev: Message[]) => Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  setErrors: (update: (prev: ErrorMessageType[]) => ErrorMessageType[]) => void;
  logger: any;
}

export const ChatReactor = defineReactor<ChatReactorConfig>({
  name: "ChatReactor",

  // Stream layer - handle text deltas for real-time streaming
  onTextDelta(event: TextDeltaEvent, config: ChatReactorConfig) {
    config.logger.debug("text_delta", { text: event.data.text });
    config.setStreaming((prev) => prev + event.data.text);
  },

  // Message layer - handle complete messages
  onAssistantMessage(event: AssistantMessageEvent, config: ChatReactorConfig) {
    config.logger.info("assistant_message", { uuid: event.uuid });
    const assistantMsg = event.data;

    // Clear streaming but keep loading (turn may continue with tool calls)
    config.setStreaming(() => "");
    config.setMessages((prev) => {
      // Check if message already exists
      if (prev.some((m) => m.id === assistantMsg.id)) {
        return prev;
      }
      return [...prev, assistantMsg];
    });
  },

  onToolUseMessage(event: ToolUseMessageEvent, config: ChatReactorConfig) {
    config.logger.info("tool_use_message", { uuid: event.uuid });
    const toolMsg = event.data;

    config.setMessages((prev) => {
      // Check if message already exists
      if (prev.some((m) => m.id === toolMsg.id)) {
        return prev;
      }
      return [...prev, toolMsg];
    });
  },

  // Stream layer - handle tool results
  onToolResult(event: ToolResultEvent, config: ChatReactorConfig) {
    config.logger.info("tool_result", { toolId: event.data.toolId, content: event.data.content });
    const { toolId, content, isError } = event.data;

    config.setMessages((prev) =>
      prev.map((msg) => {
        // Find the ToolUseMessage with matching toolCall.id
        if (msg.role === "tool-use" && msg.toolCall.id === toolId) {
          return {
            ...msg,
            toolResult: {
              ...msg.toolResult,
              output: {
                type: isError ? ("error-text" as const) : ("text" as const),
                value: typeof content === "string" ? content : JSON.stringify(content),
              },
            },
          };
        }
        return msg;
      })
    );
  },

  // State layer - handle conversation lifecycle
  onConversationStart(event: ConversationStartStateEvent, config: ChatReactorConfig) {
    config.logger.info("conversation_start", { uuid: event.uuid });
    config.setIsLoading(true);
    config.setStreaming(() => ""); // Clear any previous streaming
    config.setErrors(() => []); // Clear previous errors
  },

  onConversationEnd(event: ConversationEndStateEvent, config: ChatReactorConfig) {
    config.logger.info("conversation_end", { uuid: event.uuid });
  },

  // Turn layer - handle turn completion
  onTurnResponse(event: TurnResponseEvent, config: ChatReactorConfig) {
    config.logger.info("turn_response", {
      uuid: event.uuid,
    });
    config.setIsLoading(false);
    config.setStreaming(() => "");
  },

  // Error handling
  onErrorMessage(event: ErrorMessageEvent, config: ChatReactorConfig) {
    config.logger.error("error_message", { error: event.data });
    const errorMsg = event.data;
    config.setErrors((prev) => [...prev, errorMsg]);
    config.setIsLoading(false);
    config.setStreaming(() => "");
  },
});
