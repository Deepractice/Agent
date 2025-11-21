import { useState } from "react";
import { MarkdownText } from "~/components/typography/MarkdownText";

export interface ThinkingContentProps {
  /**
   * AI reasoning text
   */
  reasoning: string;

  /**
   * Token count for thinking (optional)
   */
  tokenCount?: number;

  /**
   * Whether this thinking is currently streaming
   */
  isStreaming?: boolean;

  /**
   * Whether to show collapsed by default
   */
  defaultCollapsed?: boolean;
}

/**
 * ThinkingContent - Render AI's extended thinking/reasoning process
 *
 * @example
 * ```tsx
 * <ThinkingContent reasoning="Let me analyze this..." tokenCount={150} />
 * <ThinkingContent reasoning="Thinking..." isStreaming />
 * ```
 */
export function ThinkingContent({
  reasoning,
  tokenCount,
  isStreaming = false,
  defaultCollapsed = true,
}: ThinkingContentProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  return (
    <div className="w-full border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-950/30">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-purple-900 dark:text-purple-100 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-600 dark:text-purple-400">💭</span>
          <span>Thinking Process</span>
          {tokenCount !== undefined && (
            <span className="text-xs text-purple-600 dark:text-purple-400">
              ({tokenCount} tokens)
            </span>
          )}
        </div>
        <span className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-purple-200 dark:border-purple-800">
          <div className="text-sm text-purple-900 dark:text-purple-100">
            <MarkdownText>{reasoning}</MarkdownText>

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-purple-600 dark:bg-purple-500 animate-pulse ml-1 align-middle">
                ▋
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
