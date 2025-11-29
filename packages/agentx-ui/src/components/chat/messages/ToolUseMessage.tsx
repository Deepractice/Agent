import { useState } from "react";
import type { ToolCallMessage, ToolResultMessage } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { Wrench, ChevronDown, Loader2 } from "lucide-react";
import { ToolCallContent } from "./parts/ToolCallContent";
import { ToolResultContent } from "./parts/ToolResultContent";

export interface ToolUseMessageProps {
  /**
   * Tool call message
   */
  toolCall: ToolCallMessage;

  /**
   * Tool result message (optional - may not have arrived yet)
   */
  toolResult?: ToolResultMessage;

  /**
   * Whether to show expanded by default
   */
  defaultExpanded?: boolean;
}

/**
 * ToolUseMessage - Unified display of tool call + result
 *
 * Combines ToolCallMessage and ToolResultMessage into a single visual unit.
 * Supports streaming: shows "executing" state when result hasn't arrived yet.
 *
 * @example
 * ```tsx
 * <ToolUseMessage
 *   toolCall={toolCallMsg}
 *   toolResult={toolResultMsg}
 * />
 * ```
 */
export function ToolUseMessage({
  toolCall,
  toolResult,
  defaultExpanded = false,
}: ToolUseMessageProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Determine status
  const status = toolResult
    ? toolResult.toolResult.output.type.includes("error")
      ? "error"
      : "success"
    : "executing";

  // Status indicators
  const statusConfig = {
    executing: {
      icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-900 dark:text-blue-100",
    },
    success: {
      icon: <span className="text-green-600 dark:text-green-400">✅</span>,
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-900 dark:text-green-100",
    },
    error: {
      icon: <span className="text-red-600 dark:text-red-400">❌</span>,
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
      textColor: "text-red-900 dark:text-red-100",
    },
  };

  const config = statusConfig[status];

  // Calculate duration
  const duration =
    toolResult && toolCall ? ((toolResult.timestamp - toolCall.timestamp) / 1000).toFixed(2) : null;

  return (
    <div className="chat-message tool-use">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label="Tool"
          variant="primary"
          icon={<Wrench className="w-5 h-5 text-white" />}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0">
          <div className={`w-full border ${config.borderColor} rounded-lg ${config.bgColor}`}>
            {/* Header - Clickable to expand/collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-full px-4 py-3 flex items-center justify-between ${config.textColor} hover:opacity-80 transition-opacity rounded-t-lg`}
            >
              <div className="flex items-center gap-3">
                {config.icon}
                <span className="font-medium font-mono">{toolCall.toolCall.name}</span>
                {duration && <span className="text-xs opacity-70">• {duration}s</span>}
                {status === "executing" && (
                  <span className="text-xs opacity-70">• Executing...</span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 transform transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className={`px-4 pb-4 pt-2 border-t ${config.borderColor} space-y-4`}>
                {/* Tool Call Input */}
                <div>
                  <div className="text-xs font-medium opacity-70 mb-2 uppercase tracking-wide">
                    Input
                  </div>
                  <ToolCallContent
                    id={toolCall.toolCall.id}
                    name={toolCall.toolCall.name}
                    input={toolCall.toolCall.input}
                  />
                </div>

                {/* Tool Result Output */}
                {toolResult ? (
                  <div>
                    <div className="text-xs font-medium opacity-70 mb-2 uppercase tracking-wide">
                      Output
                    </div>
                    <ToolResultContent
                      id={toolResult.toolResult.id}
                      name={toolResult.toolResult.name}
                      output={toolResult.toolResult.output}
                      defaultCollapsed={false}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 py-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span className="text-sm">Waiting for result...</span>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs opacity-60 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-medium">Call ID:</span>{" "}
                  <span className="font-mono">{toolCall.toolCall.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
