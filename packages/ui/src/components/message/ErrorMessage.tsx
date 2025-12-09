/**
 * ErrorMessage - Error message handler and component
 *
 * Handler: Processes messages with subtype "error"
 * Component: Displays error message with red styling
 */

import * as React from "react";
import type { Message, ErrorMessage as ErrorMessageType } from "agentxjs";
import { BaseMessageHandler } from "./MessageHandler";
import { MessageAvatar } from "./MessageAvatar";
import { cn } from "~/utils/utils";

// ============================================================================
// Component
// ============================================================================

export interface ErrorMessageProps {
  /**
   * Error message data
   */
  message: ErrorMessageType;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * ErrorMessage Component
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className }) => {
  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <MessageAvatar role="error" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-destructive mb-1">
          Error{message.errorCode ? ` (${message.errorCode})` : ""}
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2 text-sm text-destructive">
          {message.content}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Handler
// ============================================================================

export class ErrorMessageHandler extends BaseMessageHandler {
  canHandle(message: Message): boolean {
    return message.subtype === "error";
  }

  protected renderMessage(message: Message): React.ReactNode {
    return <ErrorMessage message={message as ErrorMessageType} />;
  }
}
