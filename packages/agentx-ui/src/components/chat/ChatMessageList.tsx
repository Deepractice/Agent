import { useRef, useEffect } from "react";
import type { Message } from "@deepractice-ai/agentx-types";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ToolUseMessage } from "./ToolUseMessage";
import { SystemMessage } from "./SystemMessage";

export interface ChatMessageListProps {
  /**
   * Array of messages to display
   */
  messages: Message[];

  /**
   * Current streaming text (if any)
   */
  streamingText?: string;

  /**
   * Whether agent is loading/thinking
   */
  isLoading?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * ChatMessageList - Display a scrollable list of chat messages
 *
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Empty state (welcome screen)
 * - Loading indicator
 * - Streaming message display
 * - Responsive max-width container
 *
 * @example
 * ```tsx
 * <ChatMessageList
 *   messages={messages}
 *   streamingText={currentStream}
 *   isLoading={isThinking}
 * />
 * ```
 */
export function ChatMessageList({
  messages,
  streamingText,
  isLoading = false,
  className = "",
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, streamingText]);

  // Empty state - Welcome screen
  if (messages.length === 0 && !isLoading && !streamingText) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome to Deepractice Agent
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Type a message below to start a new conversation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto overflow-x-hidden relative ${className}`}>
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Existing messages - route by role */}
        {messages.map((msg, index) => {
          const getContentInfo = () => {
            if (msg.role === 'assistant' || msg.role === 'user') {
              return {
                length: typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length,
                preview: typeof msg.content === 'string' ? msg.content.substring(0, 30) + "..." : "complex content",
              };
            }
            return { length: 0, preview: "N/A" };
          };

          const contentInfo = getContentInfo();
          console.log(`[Linus] 🖼️ Rendering message [${index}]:`, {
            id: msg.id,
            role: msg.role,
            contentLength: contentInfo.length,
            contentPreview: contentInfo.preview,
          });

          switch (msg.role) {
            case "user":
              return <UserMessage key={msg.id} message={msg} />;
            case "assistant":
              console.log(`[Linus] ✅ Rendering AssistantMessage component for id:`, msg.id);
              return <AssistantMessage key={msg.id} message={msg} />;
            case "tool-use":
              return <ToolUseMessage key={msg.id} message={msg} />;
            case "system":
              return <SystemMessage key={msg.id} message={msg} />;
            default:
              return null;
          }
        })}

        {/* Streaming message - only show if last message is NOT assistant (避免与完整消息重复) */}
        {(() => {
          const lastMsg = messages[messages.length - 1];
          const shouldShowStreaming = streamingText && lastMsg?.role !== 'assistant';

          const getContentLength = (msg: typeof lastMsg) => {
            if (!msg) return 0;
            if (msg.role === 'assistant' || msg.role === 'user') {
              return typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length;
            }
            return 0;
          };

          console.log("[Linus] 🎬 Streaming render decision:", {
            hasStreamingText: !!streamingText,
            streamingLength: streamingText?.length || 0,
            messagesCount: messages.length,
            lastMessageId: lastMsg?.id,
            lastMessageRole: lastMsg?.role,
            lastMessageContentLength: getContentLength(lastMsg),
            shouldShowStreaming,
            streamingPreview: streamingText ? streamingText.substring(0, 50) + "..." : "N/A",
            timestamp: new Date().toISOString(),
          });

          if (shouldShowStreaming && streamingText) {
            console.log("[Linus] 🎥 RENDERING streaming AssistantMessage component");
            return (
              <AssistantMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingText,
                  timestamp: Date.now(),
                }}
                isStreaming
              />
            );
          } else {
            console.log("[Linus] 🚫 NOT rendering streaming component");
            return null;
          }
        })()}

        {/* Loading indicator (only if no streaming text) */}
        {isLoading && !streamingText && (
          <div className="chat-message assistant">
            <div className="w-full">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                  🤖
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Agent</div>
              </div>
              <div className="w-full text-sm text-gray-500 dark:text-gray-400 pl-3 sm:pl-0">
                <div className="flex items-center space-x-1">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse" style={{ animationDelay: "0.2s" }}>
                    ●
                  </div>
                  <div className="animate-pulse" style={{ animationDelay: "0.4s" }}>
                    ●
                  </div>
                  <span className="ml-2">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
