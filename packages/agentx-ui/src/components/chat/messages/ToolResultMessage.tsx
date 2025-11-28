import type { ToolResultMessage as ToolResultMessageType } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { CheckCircle } from "lucide-react";
import { ToolResultContent } from "./parts/ToolResultContent";

export interface ToolResultMessageProps {
  /**
   * Tool result message data
   */
  message: ToolResultMessageType;
}

/**
 * ToolResultMessage - Display tool execution result
 *
 * Features:
 * - Tool result avatar (success green)
 * - Tool result display (collapsible)
 * - Rich output formatting
 *
 * @example
 * ```tsx
 * <ToolResultMessage message={{
 *   id: '4',
 *   role: 'tool',
 *   subtype: 'tool-result',
 *   toolResult: {
 *     type: 'tool-result',
 *     id: 'call_123',
 *     name: 'get_weather',
 *     output: { type: 'text', value: 'Temperature: 72°F' }
 *   },
 *   toolCallId: 'call_123',
 *   timestamp: Date.now()
 * }} />
 * ```
 */
export function ToolResultMessage({ message }: ToolResultMessageProps) {
  return (
    <div className="chat-message tool-result">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label="Result"
          variant="success"
          icon={<CheckCircle className="w-5 h-5 text-white" />}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0">
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
