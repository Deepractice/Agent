/**
 * UserMessage - User message handler and component
 *
 * Handler: Processes messages with subtype "user"
 * Component: Displays user message with right-aligned layout and status indicator
 */

import * as React from "react";
import type { Message, UserMessage as UserMessageType } from "agentxjs";
import { Loader2, Check, AlertCircle, PauseCircle } from "lucide-react";
import { BaseMessageHandler } from "./MessageHandler";
import { MessageAvatar } from "./MessageAvatar";
import { MessageContent } from "./MessageContent";
import { cn } from "~/utils/utils";
import type { MessageStatus, UIMessage } from "~/hooks/useAgent";

// ============================================================================
// Component
// ============================================================================

export interface UserMessageProps {
  /**
   * User message data
   */
  message: UIMessage;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status?: MessageStatus }> = ({ status }) => {
  if (!status) return null;

  const iconClassName = "w-4 h-4 flex-shrink-0";

  switch (status) {
    case "pending":
      return <Loader2 className={cn(iconClassName, "animate-spin text-muted-foreground")} />;
    case "success":
      return <Check className={cn(iconClassName, "text-green-500")} />;
    case "error":
      return <AlertCircle className={cn(iconClassName, "text-red-500")} />;
    case "interrupted":
      return <PauseCircle className={cn(iconClassName, "text-gray-500")} />;
    default:
      return null;
  }
};

/**
 * UserMessage Component
 */
export const UserMessage: React.FC<UserMessageProps> = ({ message, className }) => {
  const status = message.metadata?.status;
  const userMessage = message as UserMessageType;

  return (
    <div className={cn("flex gap-3 py-2 flex-row-reverse", className)}>
      <MessageAvatar role="user" />
      <div className="flex items-start gap-2 max-w-[80%]">
        <div className="rounded-lg px-4 py-2 bg-primary text-primary-foreground">
          <MessageContent content={userMessage.content} className="text-sm" />
        </div>
        <div className="flex items-center h-8">
          <StatusIcon status={status} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Handler
// ============================================================================

export class UserMessageHandler extends BaseMessageHandler {
  canHandle(message: Message): boolean {
    return message.subtype === "user";
  }

  protected renderMessage(message: Message): React.ReactNode {
    return <UserMessage message={message as UIMessage} />;
  }
}
