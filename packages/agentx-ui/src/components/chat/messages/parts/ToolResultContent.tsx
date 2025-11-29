import { useState } from "react";
import { MarkdownText } from "~/components/typography/MarkdownText";
import { ImageContent } from "./ImageContent";
import { FileContent } from "./FileContent";
import type { ToolResultOutput } from "@deepractice-ai/agentx-types";

export interface ToolResultContentProps {
  /**
   * Tool call ID this result corresponds to
   */
  id: string;

  /**
   * Tool name
   */
  name: string;

  /**
   * Tool execution output
   */
  output: ToolResultOutput;

  /**
   * Whether to show collapsed by default
   */
  defaultCollapsed?: boolean;
}

/**
 * ToolResultContent - Render tool execution result
 *
 * @example
 * ```tsx
 * <ToolResultContent
 *   id="call_123"
 *   name="get_weather"
 *   output={{ type: "text", value: "Temperature: 72°F" }}
 * />
 * ```
 */
export function ToolResultContent({
  id,
  name,
  output,
  defaultCollapsed = false,
}: ToolResultContentProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  // Determine result status
  const isError =
    output.type === "error-text" ||
    output.type === "error-json" ||
    output.type === "execution-denied";

  // Get status color
  const getStatusColor = () => {
    if (isError) return "red";
    return "green";
  };

  const statusColor = getStatusColor();

  // Render output based on type
  const renderOutput = () => {
    switch (output.type) {
      case "text":
        return (
          <div className="text-sm text-gray-900 dark:text-gray-100">
            <MarkdownText>{output.value}</MarkdownText>
          </div>
        );

      case "json":
        return (
          <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-3 overflow-x-auto">
            <pre className="text-xs text-gray-900 dark:text-gray-100 font-mono">
              {JSON.stringify(output.value, null, 2)}
            </pre>
          </div>
        );

      case "error-text":
        return (
          <div className="text-sm text-red-600 dark:text-red-400">
            <MarkdownText>{output.value}</MarkdownText>
          </div>
        );

      case "error-json":
        return (
          <div className="bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800 p-3 overflow-x-auto">
            <pre className="text-xs text-red-600 dark:text-red-400 font-mono">
              {JSON.stringify(output.value, null, 2)}
            </pre>
          </div>
        );

      case "execution-denied":
        return (
          <div className="text-sm text-orange-600 dark:text-orange-400">
            🚫 Execution denied
            {output.reason && <div className="mt-1 text-xs">Reason: {output.reason}</div>}
          </div>
        );

      case "content":
        return (
          <div className="space-y-3">
            {output.value.map((part, index) => {
              if (part.type === "text") {
                return (
                  <div key={index} className="text-sm text-gray-900 dark:text-gray-100">
                    <MarkdownText>{part.text}</MarkdownText>
                  </div>
                );
              } else if (part.type === "image") {
                return (
                  <ImageContent
                    key={index}
                    data={part.data}
                    mediaType={part.mediaType}
                    name={part.name}
                  />
                );
              } else if (part.type === "file") {
                return (
                  <FileContent
                    key={index}
                    data={part.data}
                    mediaType={part.mediaType}
                    filename={part.filename}
                  />
                );
              }
              return null;
            })}
          </div>
        );

      default:
        return <div className="text-sm text-gray-500 dark:text-gray-400">Unknown output type</div>;
    }
  };

  return (
    <div
      className={`w-full border border-${statusColor}-200 dark:border-${statusColor}-800 rounded-lg bg-${statusColor}-50 dark:bg-${statusColor}-950/30`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-${statusColor}-900 dark:text-${statusColor}-100 hover:bg-${statusColor}-100 dark:hover:bg-${statusColor}-900/30 transition-colors rounded-t-lg`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-${statusColor}-600 dark:text-${statusColor}-400`}>
            {isError ? "❌" : "✅"}
          </span>
          <span className="font-mono">{name}</span>
          <span className={`text-xs text-${statusColor}-600 dark:text-${statusColor}-400`}>
            ({isError ? "Error" : "Result"})
          </span>
        </div>
        <span className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          className={`px-4 py-3 border-t border-${statusColor}-200 dark:border-${statusColor}-800 space-y-3`}
        >
          {/* Call ID */}
          <div className={`text-xs text-${statusColor}-600 dark:text-${statusColor}-400`}>
            <span className="font-medium">Call ID:</span> <span className="font-mono">{id}</span>
          </div>

          {/* Output */}
          <div>
            <div
              className={`text-xs font-medium text-${statusColor}-900 dark:text-${statusColor}-100 mb-1`}
            >
              Output:
            </div>
            {renderOutput()}
          </div>
        </div>
      )}
    </div>
  );
}
