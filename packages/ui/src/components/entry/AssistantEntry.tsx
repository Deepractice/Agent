/**
 * AssistantEntry - AI assistant response entry
 *
 * Displays assistant's text content with embedded tool blocks.
 * Supports streaming and completed states.
 *
 * @example
 * ```tsx
 * // Completed entry
 * <AssistantEntryComponent
 *   entry={{
 *     type: "assistant",
 *     id: "msg_123",
 *     content: "Let me check that for you.",
 *     timestamp: Date.now(),
 *     status: "completed",
 *     blocks: [
 *       { id: "t1", toolCallId: "tc1", name: "Bash", input: {}, status: "success" }
 *     ],
 *   }}
 * />
 *
 * // Streaming entry
 * <AssistantEntryComponent
 *   entry={{
 *     type: "assistant",
 *     id: "pending_123",
 *     content: "",
 *     timestamp: Date.now(),
 *     status: "streaming",
 *     blocks: [],
 *   }}
 *   streamingText="I'm thinking about..."
 * />
 * ```
 */

import * as React from "react";
import { MessageAvatar } from "~/components/message/MessageAvatar";
import { MessageContent } from "~/components/message/MessageContent";
import { ToolBlock } from "./blocks/ToolBlock";
import { cn } from "~/utils/utils";
import type { AssistantConversationData } from "./types";

export interface AssistantEntryProps {
  /**
   * Assistant conversation data
   */
  entry: AssistantConversationData;
  /**
   * Streaming text (for streaming status)
   */
  streamingText?: string;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * AssistantEntry Component
 */
export const AssistantEntry: React.FC<AssistantEntryProps> = ({
  entry,
  streamingText = "",
  className,
}) => {
  const [dots, setDots] = React.useState("");

  // Animated dots for queued/processing/thinking states
  React.useEffect(() => {
    if (entry.status === "queued" || entry.status === "processing" || entry.status === "thinking") {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [entry.status]);

  const hasBlocks = entry.blocks.length > 0;

  const renderTextContent = () => {
    switch (entry.status) {
      case "queued":
        return <span className="text-muted-foreground">Queued{dots}</span>;

      case "processing":
        return <span className="text-muted-foreground">Processing{dots}</span>;

      case "thinking":
        return <span className="text-muted-foreground">Thinking{dots}</span>;

      case "streaming":
        return (
          <>
            <MessageContent content={streamingText} />
            <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5 align-middle" />
          </>
        );

      case "completed":
        return <MessageContent content={entry.content} />;

      default:
        return null;
    }
  };

  // Determine if we should show text content area
  const shouldShowTextContent =
    entry.status === "queued" ||
    entry.status === "processing" ||
    entry.status === "thinking" ||
    entry.status === "streaming" ||
    (entry.status === "completed" && entry.content.length > 0);

  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <MessageAvatar role="assistant" />
      <div className="flex-1 min-w-0 space-y-2">
        {/* Text content */}
        {shouldShowTextContent && (
          <div className="rounded-lg px-4 py-2 bg-muted inline-block max-w-full">
            <div className="text-sm">{renderTextContent()}</div>
          </div>
        )}

        {/* Embedded tool blocks */}
        {hasBlocks && (
          <div className="space-y-2 max-w-2xl">
            {entry.blocks.map((block) => (
              <ToolBlock key={block.id} block={block} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantEntry;
