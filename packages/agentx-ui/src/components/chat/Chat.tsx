import { useState, useEffect, useRef } from "react";
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
import { LoggerFactory } from "../../internal/WebSocketLogger";

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

  // Flag to ignore text_delta after assistant_message received
  const streamingCompleteRef = useRef(false);

  useEffect(() => {
    logger.info("Setting up event listeners using agent.react()");

    // Use agent.react() - the new Framework API
    const unsubscribe = agent.react({
      // Stream layer - handle text deltas for real-time streaming
      onTextDelta(event: TextDeltaEvent) {
        console.log("[Linus] 🔵 onTextDelta triggered", {
          textLength: event.data.text.length,
          streamingCompleteFlag: streamingCompleteRef.current,
          timestamp: new Date().toISOString(),
        });

        // Ignore text_delta after assistant_message is received
        if (streamingCompleteRef.current) {
          console.log("[Linus] ❌ IGNORED - streaming already complete");
          return;
        }

        logger.debug("text_delta", { text: event.data.text });
        setStreaming((prev) => {
          // Double-check inside setState callback (async state updates may be queued)
          if (streamingCompleteRef.current) {
            console.log("[Linus] ❌ IGNORED in setState - streaming completed during queue");
            return ""; // Clear streaming
          }
          const newValue = prev + event.data.text;
          console.log("[Linus] ✅ Streaming updated:", {
            prevLength: prev.length,
            newLength: newValue.length,
            deltaLength: event.data.text.length,
          });
          return newValue;
        });
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

        console.log("[Linus] 🟢 onAssistantMessage triggered", {
          eventUuid: event.uuid,
          messageId: assistantMsg.id,
          contentType: typeof assistantMsg.content,
          contentLength: typeof assistantMsg.content === 'string' ? assistantMsg.content.length : assistantMsg.content.length,
          contentPreview: typeof assistantMsg.content === 'string'
            ? assistantMsg.content.substring(0, 50) + "..."
            : JSON.stringify(assistantMsg.content).substring(0, 50) + "...",
          timestamp: new Date().toISOString(),
          streamingCompleteFlagBefore: streamingCompleteRef.current,
        });

        // Mark streaming as complete to ignore subsequent text_delta events
        streamingCompleteRef.current = true;
        console.log("[Linus] 🔒 Set streamingCompleteRef = true");

        // Clear streaming but keep loading (turn may continue with tool calls)
        console.log("[Linus] 🧹 Clearing streaming state...");
        setStreaming("");

        // DON'T set isLoading(false) here - wait for turn_response
        setMessages((prev) => {
          console.log("[Linus] 📝 setMessages callback - Current state:", {
            currentMessagesCount: prev.length,
            currentMessageIds: prev.map(m => ({ id: m.id, role: m.role })),
          });

          // Check if message already exists
          if (prev.some((m) => m.id === assistantMsg.id)) {
            console.log("[Linus] ⚠️ DUPLICATE DETECTED - Message already exists, skipping", {
              duplicateId: assistantMsg.id,
            });
            return prev;
          }

          console.log("[Linus] ✅ Adding NEW assistant message to array", {
            newMessageId: assistantMsg.id,
            prevLength: prev.length,
            newLength: prev.length + 1,
            lastMessageRole: prev[prev.length - 1]?.role,
          });
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
        // Reset streaming flag for new conversation
        streamingCompleteRef.current = false;
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
    console.log("[Linus] 🚀 handleSend called - Starting new turn", {
      textLength: text.length,
      timestamp: new Date().toISOString(),
    });

    logger.info("handleSend called", { text });

    // Reset streaming flag for new turn (allow streaming for new response)
    console.log("[Linus] 🔓 Resetting streamingCompleteRef to false");
    streamingCompleteRef.current = false;

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

    console.log("[Linus] 📤 Adding user message locally", {
      userId: userMessage.id,
    });

    setMessages((prev) => {
      console.log("[Linus] 📝 User message added - Messages state:", {
        prevCount: prev.length,
        newCount: prev.length + 1,
      });
      return [...prev, userMessage];
    });

    try {
      console.log("[Linus] 📡 Sending message to agent...");
      await agent.send(text);
      console.log("[Linus] ✅ Agent.send() completed");
      logger.info("Send completed");
    } catch (error) {
      console.error("[Linus] ❌ Agent.send() failed:", error);
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
