import type { AssistantMessage as AssistantMessageType } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { Bot } from "lucide-react";
import { TextContent } from "./parts/TextContent";
import { ThinkingContent } from "./parts/ThinkingContent";
import { ToolCallContent } from "./parts/ToolCallContent";
import { FileContent } from "./parts/FileContent";

export interface AssistantMessageProps {
  /**
   * Assistant message data
   */
  message: AssistantMessageType;

  /**
   * Whether this message is currently streaming
   */
  isStreaming?: boolean;
}

/**
 * AssistantMessage - Display an AI assistant message
 *
 * Features:
 * - AI avatar (blue color)
 * - Text content rendering
 * - Thinking process (collapsible)
 * - Tool calls display
 * - File attachments
 * - Streaming support
 *
 * @example
 * ```tsx
 * <AssistantMessage message={{
 *   id: '2',
 *   role: 'assistant',
 *   content: 'Here is the answer...',
 *   timestamp: Date.now()
 * }} />
 * ```
 */
export function AssistantMessage({ message, isStreaming = false }: AssistantMessageProps) {
  return (
    <div className="chat-message assistant">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label="Agent"
          variant="primary"
          icon={<Bot className="w-5 h-5 text-white" />}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0 space-y-2">
          {typeof message.content === "string" ? (
            <TextContent text={message.content} isStreaming={isStreaming} />
          ) : (
            message.content.map((part, idx) => {
              const isLastPart =
                Array.isArray(message.content) && idx === message.content.length - 1;

              switch (part.type) {
                case "text":
                  return (
                    <TextContent
                      key={idx}
                      text={part.text}
                      isStreaming={isStreaming && isLastPart}
                    />
                  );
                case "thinking":
                  return (
                    <ThinkingContent
                      key={idx}
                      reasoning={part.reasoning}
                      tokenCount={part.tokenCount}
                      isStreaming={isStreaming && isLastPart}
                    />
                  );
                case "tool-call":
                  return (
                    <ToolCallContent key={idx} id={part.id} name={part.name} input={part.input} />
                  );
                case "file":
                  return (
                    <FileContent
                      key={idx}
                      data={part.data}
                      mediaType={part.mediaType}
                      filename={part.filename}
                    />
                  );
                default:
                  return null;
              }
            })
          )}
        </div>
      </div>
    </div>
  );
}
