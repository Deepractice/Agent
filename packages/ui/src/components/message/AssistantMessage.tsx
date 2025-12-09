/**
 * AssistantMessage - Assistant message handler and component
 *
 * Handler: Processes messages with subtype "assistant"
 * Component: Displays assistant message with left-aligned layout
 *
 * Handles all assistant message lifecycle states:
 * - queued: Waiting to start processing
 * - thinking: AI is thinking (extended thinking block)
 * - responding: AI is streaming response
 * - success: Complete message
 */

import * as React from "react";
import type { Message, AssistantMessage as AssistantMessageType } from "agentxjs";
import { BaseMessageHandler } from "./MessageHandler";
import { MessageAvatar } from "./MessageAvatar";
import { MessageContent } from "./MessageContent";
import { cn } from "~/utils/utils";

// ============================================================================
// Component
// ============================================================================

export type AssistantMessageStatus = "queued" | "thinking" | "responding" | "success";

export interface AssistantMessageProps {
  /**
   * Assistant message data
   */
  message: AssistantMessageType;
  /**
   * Message status (lifecycle state)
   */
  status?: AssistantMessageStatus;
  /**
   * Streaming text (when status === 'responding')
   */
  streamingText?: string;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * AssistantMessage Component
 *
 * Renders different content based on lifecycle status
 */
export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  status = "success",
  streamingText = "",
  className,
}) => {
  const [dots, setDots] = React.useState("");

  // Animated dots for queued/thinking states
  React.useEffect(() => {
    if (status === "queued" || status === "thinking") {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <MessageAvatar role="assistant" />
      <div className="rounded-lg px-4 py-2 bg-muted">
        <div className="text-sm">
          {/* Queued - waiting to start */}
          {status === "queued" && <span className="text-muted-foreground">Queue{dots}</span>}

          {/* Thinking - extended thinking block */}
          {status === "thinking" && <span className="text-muted-foreground">Thinking{dots}</span>}

          {/* Responding - streaming text with cursor */}
          {status === "responding" && (
            <>
              <MessageContent content={streamingText} />
              <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5 align-middle" />
            </>
          )}

          {/* Success - complete message */}
          {status === "success" && <MessageContent content={message.content} />}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Handler
// ============================================================================

export class AssistantMessageHandler extends BaseMessageHandler {
  canHandle(message: Message): boolean {
    return message.subtype === "assistant";
  }

  protected renderMessage(message: Message): React.ReactNode {
    return <AssistantMessage message={message as AssistantMessageType} />;
  }
}
