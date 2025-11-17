import type { ToolUseMessage as ToolUseMessageType } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { Wrench } from "lucide-react";
import { ToolCallContent } from "./parts/ToolCallContent";
import { ToolResultContent } from "./parts/ToolResultContent";

export interface ToolUseMessageProps {
  /**
   * Tool use message data
   */
  message: ToolUseMessageType;
}

/**
 * ToolUseMessage - Display a complete tool usage (call + result)
 *
 * Features:
 * - Tool avatar (info blue)
 * - Tool call display (collapsible)
 * - Tool result display (collapsible)
 * - Rich output formatting
 *
 * @example
 * ```tsx
 * <ToolUseMessage message={{
 *   id: '3',
 *   role: 'tool-use',
 *   toolCall: {
 *     type: 'tool-call',
 *     id: 'call_123',
 *     name: 'get_weather',
 *     input: { location: 'San Francisco' }
 *   },
 *   toolResult: {
 *     type: 'tool-result',
 *     id: 'call_123',
 *     name: 'get_weather',
 *     output: { type: 'text', value: 'Temperature: 72°F' }
 *   },
 *   timestamp: Date.now()
 * }} />
 * ```
 */
export function ToolUseMessage({ message }: ToolUseMessageProps) {
  return (
    <div className="chat-message tool-use">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label="Tool"
          variant="info"
          icon={<Wrench className="w-5 h-5 text-white" />}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0 space-y-2">
          {/* Tool call */}
          <ToolCallContent
            id={message.toolCall.id}
            name={message.toolCall.name}
            input={message.toolCall.input}
            defaultCollapsed={true}
          />

          {/* Tool result */}
          <ToolResultContent
            id={message.toolResult.id}
            name={message.toolResult.name}
            output={message.toolResult.output}
            defaultCollapsed={true}
          />
        </div>
      </div>
    </div>
  );
}
