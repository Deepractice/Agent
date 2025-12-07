/**
 * MessagePane - Message display area component
 *
 * A pure UI component for displaying messages with:
 * - User and assistant message bubbles
 * - Streaming text indicator
 * - Auto-scroll to bottom
 * - Empty state
 * - Markdown rendering support
 *
 * This component knows nothing about business concepts.
 * It only deals with generic "messages" with role and content.
 *
 * @example
 * ```tsx
 * <MessagePane
 *   items={messages}
 *   streamingText="Currently typing..."
 *   renderContent={(content) => <Markdown>{content}</Markdown>}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "~/utils/utils";
import { MarkdownText } from "~/components/typography/MarkdownText";
import { EmptyState } from "~/components/element/EmptyState";
import { ToolCard, type ToolStatus } from "~/components/container/ToolCard";
import { MessageSquare } from "lucide-react";

/**
 * Tool metadata for ToolCard rendering
 */
export interface ToolMetadata {
  /** Tool name (e.g., "Bash", "Read") */
  toolName: string;
  /** Tool call ID */
  toolId?: string;
  /** Tool status */
  status: ToolStatus;
  /** Tool input parameters */
  input?: Record<string, unknown>;
  /** Tool output */
  output?: unknown;
  /** Whether output is an error */
  isError?: boolean;
  /** Execution duration in seconds */
  duration?: number;
}

/**
 * Message item data
 */
export interface MessagePaneItem {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Message role
   */
  role: "user" | "assistant" | "system" | "tool" | "error";
  /**
   * Message content (string for text, any for structured content)
   */
  content: string | unknown;
  /**
   * Timestamp
   */
  timestamp?: number;
  /**
   * Optional metadata (tool info for role="tool", errorCode for role="error")
   */
  metadata?: Record<string, unknown>;
  /**
   * Tool-specific metadata (for role="tool")
   */
  toolMetadata?: ToolMetadata;
}

export interface MessagePaneProps {
  /**
   * Messages to display
   */
  items: MessagePaneItem[];
  /**
   * Current streaming text (displays with typing indicator)
   */
  streamingText?: string;
  /**
   * Whether currently loading/thinking
   */
  isLoading?: boolean;
  /**
   * Custom content renderer
   * @default Uses MarkdownText for strings
   */
  renderContent?: (content: unknown, item: MessagePaneItem) => React.ReactNode;
  /**
   * Custom avatar renderer
   */
  renderAvatar?: (role: MessagePaneItem["role"]) => React.ReactNode;
  /**
   * Empty state configuration
   */
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
  };
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Extract text from ContentPart array
 */
const extractTextFromContentParts = (content: unknown): string | null => {
  if (!Array.isArray(content)) return null;

  const textParts = content
    .filter(
      (part): part is { type: string; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
    )
    .map((part) => part.text);

  return textParts.length > 0 ? textParts.join("\n") : null;
};

/**
 * Default content renderer
 */
const defaultRenderContent = (content: unknown): React.ReactNode => {
  // Handle string content
  if (typeof content === "string") {
    return <MarkdownText>{content}</MarkdownText>;
  }

  // Handle ContentPart[] array (e.g., [{ type: "text", text: "..." }])
  const extractedText = extractTextFromContentParts(content);
  if (extractedText !== null) {
    return <MarkdownText>{extractedText}</MarkdownText>;
  }

  // For other non-string content, render as JSON
  return (
    <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
};

/**
 * Default avatar renderer
 */
const defaultRenderAvatar = (role: MessagePaneItem["role"]): React.ReactNode => {
  const avatarClasses = cn(
    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
  );

  switch (role) {
    case "user":
      return <div className={cn(avatarClasses, "bg-primary text-primary-foreground")}>U</div>;
    case "assistant":
      return <div className={cn(avatarClasses, "bg-secondary text-secondary-foreground")}>A</div>;
    case "system":
      return <div className={cn(avatarClasses, "bg-muted text-muted-foreground")}>S</div>;
    case "tool":
      return <div className={cn(avatarClasses, "bg-accent text-accent-foreground")}>T</div>;
    case "error":
      return (
        <div className={cn(avatarClasses, "bg-destructive text-destructive-foreground")}>!</div>
      );
    default:
      return null;
  }
};

/**
 * Single message component
 */
const MessageBubble = ({
  item,
  renderContent,
  renderAvatar,
}: {
  item: MessagePaneItem;
  renderContent: (content: unknown, item: MessagePaneItem) => React.ReactNode;
  renderAvatar: (role: MessagePaneItem["role"]) => React.ReactNode;
}) => {
  const isUser = item.role === "user";
  const isSystem = item.role === "system";
  const isTool = item.role === "tool";
  const isError = item.role === "error";

  // System messages are centered
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {typeof item.content === "string" ? item.content : "System message"}
        </div>
      </div>
    );
  }

  // Tool messages use ToolCard component
  if (isTool) {
    const toolMeta = item.toolMetadata;
    if (toolMeta) {
      return (
        <div className="py-2 ml-11 max-w-2xl">
          <ToolCard
            name={toolMeta.toolName}
            id={toolMeta.toolId}
            status={toolMeta.status}
            input={toolMeta.input}
            output={toolMeta.output}
            isError={toolMeta.isError}
            duration={toolMeta.duration}
          />
        </div>
      );
    }
    // Fallback for legacy tool messages without toolMetadata
    return (
      <div className="flex gap-3 py-2">
        {renderAvatar(item.role)}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-1">
            {(item.metadata?.toolName as string) || "Tool"}
          </div>
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm">
            {renderContent(item.content, item)}
          </div>
        </div>
      </div>
    );
  }

  // Error messages have special styling
  if (isError) {
    return (
      <div className="flex gap-3 py-2">
        {renderAvatar(item.role)}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-destructive mb-1">
            Error{item.metadata?.errorCode ? ` (${item.metadata.errorCode})` : ""}
          </div>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2 text-sm text-destructive">
            {typeof item.content === "string" ? item.content : "An error occurred"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 py-2", isUser && "flex-row-reverse")}>
      {renderAvatar(item.role)}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <div className="text-sm">{renderContent(item.content, item)}</div>
      </div>
    </div>
  );
};

/**
 * Streaming text indicator
 */
const StreamingIndicator = ({
  text,
  renderAvatar,
}: {
  text: string;
  renderAvatar: (role: MessagePaneItem["role"]) => React.ReactNode;
}) => {
  return (
    <div className="flex gap-3 py-2">
      {renderAvatar("assistant")}
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
        <div className="text-sm">
          <MarkdownText>{text}</MarkdownText>
          <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5 align-middle" />
        </div>
      </div>
    </div>
  );
};

/**
 * Thinking indicator
 */
const ThinkingIndicator = ({
  renderAvatar,
}: {
  renderAvatar: (role: MessagePaneItem["role"]) => React.ReactNode;
}) => {
  return (
    <div className="flex gap-3 py-2">
      {renderAvatar("assistant")}
      <div className="rounded-lg px-4 py-2 bg-muted">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * MessagePane component
 */
export const MessagePane = React.forwardRef<HTMLDivElement, MessagePaneProps>(
  (
    {
      items,
      streamingText,
      isLoading = false,
      renderContent = defaultRenderContent,
      renderAvatar = defaultRenderAvatar,
      emptyState = {
        icon: <MessageSquare className="w-6 h-6" />,
        title: "No messages yet",
        description: "Start the conversation by sending a message",
      },
      className,
    },
    ref
  ) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    React.useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [items, streamingText, isLoading]);

    const isEmpty = items.length === 0 && !streamingText && !isLoading;

    return (
      <div ref={ref} className={cn("flex flex-col h-full bg-background", className)}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
          {isEmpty ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={emptyState.icon}
                title={emptyState.title}
                description={emptyState.description}
              />
            </div>
          ) : (
            <>
              {items.map((item) => (
                <MessageBubble
                  key={item.id}
                  item={item}
                  renderContent={renderContent}
                  renderAvatar={renderAvatar}
                />
              ))}
              {streamingText && (
                <StreamingIndicator text={streamingText} renderAvatar={renderAvatar} />
              )}
              {isLoading && !streamingText && <ThinkingIndicator renderAvatar={renderAvatar} />}
            </>
          )}
        </div>
      </div>
    );
  }
);

MessagePane.displayName = "MessagePane";
