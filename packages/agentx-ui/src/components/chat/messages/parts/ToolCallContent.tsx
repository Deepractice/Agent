import { useState } from "react";

export interface ToolCallContentProps {
  /**
   * Unique identifier for this tool call
   */
  id: string;

  /**
   * Tool name
   */
  name: string;

  /**
   * Tool input parameters
   */
  input: Record<string, unknown>;

  /**
   * Whether to show collapsed by default
   */
  defaultCollapsed?: boolean;
}

/**
 * ToolCallContent - Render AI's tool invocation request
 *
 * @example
 * ```tsx
 * <ToolCallContent
 *   id="call_123"
 *   name="get_weather"
 *   input={{ location: "San Francisco", unit: "celsius" }}
 * />
 * ```
 */
export function ToolCallContent({
  id,
  name,
  input,
  defaultCollapsed = false,
}: ToolCallContentProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  return (
    <div className="w-full border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/30">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400">🔧</span>
          <span className="font-mono">{name}</span>
          <span className="text-xs text-blue-600 dark:text-blue-400">(Tool Call)</span>
        </div>
        <span className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-blue-200 dark:border-blue-800 space-y-3">
          {/* Call ID */}
          <div className="text-xs text-blue-600 dark:text-blue-400">
            <span className="font-medium">ID:</span> <span className="font-mono">{id}</span>
          </div>

          {/* Input parameters */}
          <div>
            <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
              Input Parameters:
            </div>
            <div className="bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-blue-800 p-3 overflow-x-auto">
              <pre className="text-xs text-blue-900 dark:text-blue-100 font-mono">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
