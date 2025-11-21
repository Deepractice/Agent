import { useState, useEffect } from "react";
import type { AgentService } from "@deepractice-ai/agentx-framework/browser";
import type { Message } from "@deepractice-ai/agentx-framework/browser";
import type {
  ErrorMessageEvent,
  TextDeltaEvent,
  ToolResultEvent,
  // UserMessageEvent,  // Removed - no longer used (user messages handled locally)
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ConversationStartStateEvent,
  ConversationEndStateEvent,
  TurnResponseEvent,
  ErrorMessage as ErrorMessageType,
} from "@deepractice-ai/agentx-framework/browser";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ErrorMessage } from "./ErrorMessage";
import { LoggerFactory } from "../../../dev-tools/WebSocketLogger";

const logger = LoggerFactory.getLogger("Chat");

export interface ChatProps {
  /**
   * Agent instance from agentx-framework
   */
  agent: AgentService;

  /**
   * Initial messages to display
   */
  initialMessages?: Message[];

  /**
   * Callback when message is sent
   */
  onMessageSend?: (message: string) => void;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Chat - Complete chat interface with real Agent integration
 *
 * Features:
 * - Real-time streaming from Claude API
 * - Message history
 * - Auto-scroll
 * - Loading states
 * - Image attachment support
 * - Full event handling using new Framework API
 *
 * @example
 * ```tsx
 * import { WebSocketBrowserAgent } from '@deepractice-ai/agentx-framework/browser';
 *
 * const agent = WebSocketBrowserAgent.create({
 *   url: 'ws://localhost:5200/ws',
 *   sessionId: 'my-session',
 * });
 *
 * await agent.initialize();
 * <Chat agent={agent} />
 * ```
 */
export function Chat({ agent, initialMessages = [], onMessageSend, className = "" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);

  useEffect(() => {
    logger.info("Setting up event listeners using agent.react()");

    // Use agent.react() - the new Framework API
    const unsubscribe = agent.react({
      // Stream layer - handle text deltas for real-time streaming
      onTextDelta(event: TextDeltaEvent) {
        logger.debug("text_delta", { text: event.data.text });
        setStreaming((prev) => prev + event.data.text);
      },

      // Message layer - handle complete messages
      // NOTE: onUserMessage is REMOVED - user messages are added locally in handleSend
      // Server should NOT echo user_message back to client (see Issue #002)
      // onUserMessage(event: UserMessageEvent) {
      //   console.log("[Chat] user_message:", event.uuid);
      //   const userMsg = event.data;
      //   setMessages((prev) => {
      //     if (prev.some((m) => m.id === userMsg.id)) {
      //       return prev;
      //     }
      //     return [...prev, userMsg];
      //   });
      // },

      onAssistantMessage(event: AssistantMessageEvent) {
        logger.info("assistant_message", { uuid: event.uuid });
        const assistantMsg = event.data;

        // Clear streaming but keep loading (turn may continue with tool calls)
        setStreaming("");
        // DON'T set isLoading(false) here - wait for turn_response
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === assistantMsg.id)) {
            return prev;
          }
          return [...prev, assistantMsg];
        });
      },

      onToolUseMessage(event: ToolUseMessageEvent) {
        logger.info("tool_use_message", { uuid: event.uuid });
        const toolMsg = event.data;

        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === toolMsg.id)) {
            return prev;
          }
          return [...prev, toolMsg];
        });
      },

      // Stream layer - handle tool results
      onToolResult(event: ToolResultEvent) {
        logger.info("tool_result", { toolId: event.data.toolId, content: event.data.content });
        const { toolId, content, isError } = event.data;

        setMessages((prev) => prev.map((msg) => {
          // Find the ToolUseMessage with matching toolCall.id
          if (msg.role === "tool-use" && msg.toolCall.id === toolId) {
            return {
              ...msg,
              toolResult: {
                ...msg.toolResult,
                output: {
                  type: isError ? "error-text" as const : "text" as const,
                  value: typeof content === "string" ? content : JSON.stringify(content),
                },
              },
            };
          }
          return msg;
        }));
      },

      // Message layer - handle error messages
      onErrorMessage(event: ErrorMessageEvent) {
        logger.error("error_message", { event });
        setErrors((prev) => [...prev, event.data]);
        setIsLoading(false);
      },

      // State layer - conversation lifecycle
      onConversationStart(_event: ConversationStartStateEvent) {
        logger.info("conversation_start");
        setIsLoading(true);
      },

      onConversationEnd(_event: ConversationEndStateEvent) {
        logger.info("conversation_end");
        setIsLoading(false);
      },

      // Turn layer - turn completion (handles multi-turn agentic flows)
      onTurnResponse(_event: TurnResponseEvent) {
        logger.info("turn_response - turn complete");
        setIsLoading(false);
        setStreaming("");
      },
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [agent]);

  const handleSend = async (text: string) => {
    logger.info("handleSend called", { text });
    // console.trace("[Chat.handleSend] Stack trace");

    setIsLoading(true);
    onMessageSend?.(text);

    // Add user message to local state immediately (for instant UI feedback)
    // Server will NOT echo it back - user_message is client-to-server only
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      await agent.send(text);
      logger.info("Send completed");
    } catch (error) {
      logger.error("Send failed", { error });
    }
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Messages area */}
      <ChatMessageList messages={messages} streamingText={streaming} isLoading={isLoading} />

      {/* Error messages (above input) */}
      {errors.length > 0 && (
        <div className="px-2 sm:px-4 md:px-4 pb-2 max-w-4xl mx-auto w-full space-y-2">
          {errors.map((error) => (
            <ErrorMessage key={error.id} error={error} showDetails={true} />
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-2 sm:p-4 md:p-4 flex-shrink-0 pb-2 sm:pb-4 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSend} disabled={false} />
        </div>
      </div>
    </div>
  );
}
