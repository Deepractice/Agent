import type { SystemMessage as SystemMessageType } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { Info } from "lucide-react";
import { TextContent } from "./parts/TextContent";

export interface SystemMessageProps {
  /**
   * System message data
   */
  message: SystemMessageType;
}

/**
 * SystemMessage - Display a system message
 *
 * Features:
 * - System avatar (neutral gray)
 * - System prompt or notification display
 *
 * @example
 * ```tsx
 * <SystemMessage message={{
 *   id: '0',
 *   role: 'system',
 *   content: 'You are a helpful assistant',
 *   timestamp: Date.now()
 * }} />
 * ```
 */
export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="chat-message system">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label="System"
          variant="neutral"
          icon={<Info className="w-5 h-5 text-white" />}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0">
          <div className="text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <TextContent text={message.content} />
          </div>
        </div>
      </div>
    </div>
  );
}
