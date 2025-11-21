import { useRef, useEffect } from "react";
import type { Message } from "@deepractice-ai/agentx-types";
import { UserMessage } from "./messages/UserMessage";
import { AssistantMessage } from "./messages/AssistantMessage";
import { ToolUseMessage } from "./messages/ToolUseMessage";
import { SystemMessage } from "./messages/SystemMessage";

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
        {messages.map((msg) => {
          switch (msg.role) {
            case "user":
              return <UserMessage key={msg.id} message={msg} />;
            case "assistant":
              return <AssistantMessage key={msg.id} message={msg} />;
            case "tool-use":
              return <ToolUseMessage key={msg.id} message={msg} />;
            case "system":
              return <SystemMessage key={msg.id} message={msg} />;
            default:
              return null;
          }
        })}

        {/* Streaming message */}
        {streamingText && (
          <AssistantMessage
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingText,
              timestamp: Date.now(),
            }}
            isStreaming
          />
        )}

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
