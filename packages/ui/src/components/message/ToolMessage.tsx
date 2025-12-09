/**
 * ToolMessage - Tool call message handler and component
 *
 * Handler: Processes messages with subtype "tool-call"
 * Component: Displays tool call and result with ToolCard
 */

import * as React from "react";
import type { Message, ToolCallMessage, ToolResultMessage } from "agentxjs";
import { BaseMessageHandler } from "./MessageHandler";
import { ToolCard, type ToolStatus } from "~/components/container/ToolCard";
import { cn } from "~/utils/utils";

// ============================================================================
// Component
// ============================================================================

export interface ToolMessageProps {
  /**
   * Tool call message
   */
  toolCall: ToolCallMessage;
  /**
   * Tool result message (optional, may not have arrived yet)
   */
  toolResult?: ToolResultMessage;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * ToolMessage Component
 */
export const ToolMessage: React.FC<ToolMessageProps> = ({ toolCall, toolResult, className }) => {
  // Determine tool status
  let status: ToolStatus = "executing";
  if (toolResult) {
    // Check if result indicates error
    const outputType = toolResult.toolResult.output.type;
    const isError =
      outputType === "error-text" ||
      outputType === "error-json" ||
      outputType === "execution-denied";
    status = isError ? "error" : "success";
  }

  // Calculate duration if result is available
  const duration = toolResult ? (toolResult.timestamp - toolCall.timestamp) / 1000 : undefined;

  return (
    <div className={cn("py-2 ml-11 max-w-2xl", className)}>
      <ToolCard
        name={toolCall.toolCall.name}
        id={toolCall.toolCall.id}
        status={status}
        input={toolCall.toolCall.input}
        output={toolResult?.toolResult.output}
        isError={status === "error"}
        duration={duration}
      />
    </div>
  );
};

// ============================================================================
// Handler
// ============================================================================

/**
 * Extended message type with tool result attached
 * Chat component attaches tool-result to tool-call via metadata
 */
interface ToolCallWithResult extends ToolCallMessage {
  metadata?: {
    toolResult?: ToolResultMessage;
  };
}

export class ToolMessageHandler extends BaseMessageHandler {
  canHandle(message: Message): boolean {
    return message.subtype === "tool-call";
  }

  protected renderMessage(message: Message): React.ReactNode {
    const toolCallMessage = message as ToolCallWithResult;
    const toolResult = toolCallMessage.metadata?.toolResult;

    return <ToolMessage toolCall={toolCallMessage} toolResult={toolResult} />;
  }
}
