/**
 * UserEntry - User message entry
 *
 * Displays user's message with right-aligned layout and status indicator.
 *
 * @example
 * ```tsx
 * <UserEntryComponent
 *   entry={{
 *     type: "user",
 *     id: "msg_123",
 *     content: "Hello, can you help me?",
 *     timestamp: Date.now(),
 *     status: "success",
 *   }}
 * />
 * ```
 */

import * as React from "react";
import { Loader2, Check, AlertCircle, PauseCircle } from "lucide-react";
import { MessageAvatar } from "~/components/message/MessageAvatar";
import { MessageContent } from "~/components/message/MessageContent";
import { cn } from "~/utils/utils";
import type { UserConversationData, UserConversationStatus } from "./types";

export interface UserEntryProps {
  /**
   * User conversation data
   */
  entry: UserConversationData;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status: UserConversationStatus }> = ({ status }) => {
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
 * UserEntry Component
 */
export const UserEntry: React.FC<UserEntryProps> = ({ entry, className }) => {
  return (
    <div className={cn("flex gap-3 py-2 flex-row-reverse", className)}>
      <MessageAvatar role="user" />
      <div className="flex items-start gap-2 max-w-[80%]">
        <div className="rounded-lg px-4 py-2 bg-primary text-primary-foreground">
          <MessageContent content={entry.content} className="text-sm" />
        </div>
        <div className="flex items-center h-8">
          <StatusIcon status={entry.status} />
        </div>
      </div>
    </div>
  );
};

export default UserEntry;
