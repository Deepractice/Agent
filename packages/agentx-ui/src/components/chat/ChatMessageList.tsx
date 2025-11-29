/**
 * ChatMessageList - Display a scrollable list of chat messages
 *
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Empty state (welcome screen)
 * - Streaming message display
 * - Responsive max-width container
 *
 * Note: Loading/status indicator is now handled by AgentStatusIndicator component.
 *
 * @example
 * ```tsx
 * <ChatMessageList
 *   messages={messages}
 *   streamingText={currentStream}
 * />
 * ```
 */

import { useRef, useEffect } from "react";
import type {
  Message,
  ToolCallMessage as ToolCallMessageType,
  ToolResultMessage as ToolResultMessageType,
} from "@deepractice-ai/agentx-types";
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
   * Custom className
   */
  className?: string;
}

/**
 * Grouped tool message - combines tool-call and tool-result
 */
interface GroupedToolMessage {
  type: "tool-use";
  toolCall: ToolCallMessageType;
  toolResult?: ToolResultMessageType;
  timestamp: number;
}

/**
 * Group tool messages by toolCallId
 *
 * Combines ToolCallMessage and ToolResultMessage into unified ToolUse groups.
 * This improves UX by showing the complete tool lifecycle in one component.
 */
function groupToolMessages(messages: Message[]): (Message | GroupedToolMessage)[] {
  const toolCallMap = new Map<string, ToolCallMessageType>();
  const toolResultMap = new Map<string, ToolResultMessageType>();
  const otherMessages: Message[] = [];

  // Separate tool messages from other messages
  for (const msg of messages) {
    if (msg.subtype === "tool-call") {
      toolCallMap.set(msg.toolCall.id, msg);
    } else if (msg.subtype === "tool-result") {
      toolResultMap.set(msg.toolCallId, msg);
    } else {
      otherMessages.push(msg);
    }
  }

  // Create grouped tool messages
  const groupedToolMessages: GroupedToolMessage[] = [];
  for (const [toolCallId, toolCall] of toolCallMap.entries()) {
    groupedToolMessages.push({
      type: "tool-use",
      toolCall,
      toolResult: toolResultMap.get(toolCallId),
      timestamp: toolCall.timestamp,
    });
  }

  // Combine and sort by timestamp
  return [...otherMessages, ...groupedToolMessages].sort((a, b) => a.timestamp - b.timestamp);
}

export function ChatMessageList({ messages, streamingText, className = "" }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sort messages by timestamp to ensure correct order
  // (events may arrive out of order due to async processing)
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  // Group tool messages (tool-call + tool-result) for unified display
  const groupedMessages = groupToolMessages(sortedMessages);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, streamingText]);

  // Empty state - Welcome screen
  if (messages.length === 0 && !streamingText) {
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
        {/* Render grouped messages */}
        {groupedMessages.map((item) => {
          // Handle grouped tool messages
          if ("type" in item && item.type === "tool-use") {
            return (
              <ToolUseMessage
                key={item.toolCall.id}
                toolCall={item.toolCall}
                toolResult={item.toolResult}
              />
            );
          }

          // Handle regular messages
          const msg = item as Message;
          switch (msg.subtype) {
            case "user":
              return <UserMessage key={msg.id} message={msg} />;
            case "assistant":
              return <AssistantMessage key={msg.id} message={msg} />;
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
              subtype: "assistant",
              content: streamingText,
              timestamp: Date.now(),
            }}
            isStreaming
          />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
