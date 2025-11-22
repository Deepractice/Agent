/**
 * UIReactor - Generic UI data accumulation reactor
 *
 * Handles agent events and updates React state for UI rendering.
 * Manages streaming text, messages, and errors.
 *
 * Note: Loading/status state is NOT managed here.
 * Use AgentStatusIndicator component for status display.
 * This reactor only handles data accumulation.
 *
 * @example
 * ```tsx
 * const [streaming, setStreaming] = useState("");
 * const [messages, setMessages] = useState<Message[]>([]);
 * const [errors, setErrors] = useState<ErrorMessage[]>([]);
 *
 * useEffect(() => {
 *   const unsubscribe = agent.registerReactor(
 *     UIReactor.create({
 *       setStreaming,
 *       setMessages,
 *       setErrors,
 *     })
 *   );
 *   return () => unsubscribe();
 * }, [agent]);
 * ```
 */

import { defineReactor } from "@deepractice-ai/agentx-framework";
import type {
  TextDeltaEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ToolResultEvent,
  ErrorMessageEvent,
  Message,
  ErrorMessage as ErrorMessageType,
} from "@deepractice-ai/agentx-framework";

export interface UIReactorConfig {
  /**
   * Setter for streaming text state
   */
  setStreaming: (update: (prev: string) => string) => void;

  /**
   * Setter for messages array state
   */
  setMessages: (update: (prev: Message[]) => Message[]) => void;

  /**
   * Setter for errors array state
   */
  setErrors: (update: (prev: ErrorMessageType[]) => ErrorMessageType[]) => void;

  /**
   * Optional logger for debugging
   */
  logger?: {
    debug: (message: string, context?: any) => void;
    info: (message: string, context?: any) => void;
    error: (message: string, context?: any) => void;
  };
}

/**
 * UIReactor - Built with defineReactor
 *
 * Processes agent events and updates React state:
 * - Stream Layer: text_delta -> streaming text
 * - Message Layer: assistant_message, tool_use_message -> messages array
 * - Stream Layer: tool_result -> update tool message with result
 * - Message Layer: error_message -> errors array
 */
export const UIReactor = defineReactor<UIReactorConfig>({
  name: "UIReactor",

  // Stream layer - handle text deltas for real-time streaming
  onTextDelta(event: TextDeltaEvent, config: UIReactorConfig) {
    config.logger?.debug("text_delta", { text: event.data.text });
    config.setStreaming((prev) => prev + event.data.text);
  },

  // Message layer - handle complete messages
  onAssistantMessage(event: AssistantMessageEvent, config: UIReactorConfig) {
    config.logger?.info("assistant_message", { uuid: event.uuid });
    const assistantMsg = event.data;

    // Clear streaming (message is now complete)
    config.setStreaming(() => "");
    config.setMessages((prev) => {
      // Check if message already exists (prevent duplicates)
      if (prev.some((m) => m.id === assistantMsg.id)) {
        return prev;
      }
      return [...prev, assistantMsg];
    });
  },

  onToolUseMessage(event: ToolUseMessageEvent, config: UIReactorConfig) {
    config.logger?.info("tool_use_message", { uuid: event.uuid });
    const toolMsg = event.data;

    config.setMessages((prev) => {
      // Check if message already exists (prevent duplicates)
      if (prev.some((m) => m.id === toolMsg.id)) {
        return prev;
      }
      return [...prev, toolMsg];
    });
  },

  // Stream layer - handle tool results
  onToolResult(event: ToolResultEvent, config: UIReactorConfig) {
    config.logger?.info("tool_result", {
      toolId: event.data.toolId,
      content: event.data.content,
    });
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

  // Error handling
  onErrorMessage(event: ErrorMessageEvent, config: UIReactorConfig) {
    config.logger?.error("error_message", { error: event.data });
    const errorMsg = event.data;
    config.setErrors((prev) => [...prev, errorMsg]);
    config.setStreaming(() => "");
  },
});
