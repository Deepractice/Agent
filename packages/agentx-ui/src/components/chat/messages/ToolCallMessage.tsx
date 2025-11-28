import type { ToolCallMessage as ToolCallMessageType } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { Wrench } from "lucide-react";
import { ToolCallContent } from "./parts/ToolCallContent";

export interface ToolCallMessageProps {
  /**
   * Tool call message data
   */
  message: ToolCallMessageType;
}

/**
 * ToolCallMessage - Display AI's request to call a tool
 *
 * Features:
 * - Tool avatar (info blue)
 * - Tool call display (collapsible)
 *
 * @example
 * ```tsx
 * <ToolCallMessage message={{
 *   id: '3',
 *   role: 'assistant',
 *   subtype: 'tool-call',
 *   toolCall: {
 *     type: 'tool-call',
 *     id: 'call_123',
 *     name: 'get_weather',
 *     input: { location: 'San Francisco' }
 *   },
 *   timestamp: Date.now()
 * }} />
 * ```
 */
export function ToolCallMessage({ message }: ToolCallMessageProps) {
  return (
    <div className="chat-message tool-call">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label="Tool"
          variant="info"
          icon={<Wrench className="w-5 h-5 text-white" />}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0">
          <ToolCallContent
            id={message.toolCall.id}
            name={message.toolCall.name}
            input={message.toolCall.input}
            defaultCollapsed={true}
          />
        </div>
      </div>
    </div>
  );
}
