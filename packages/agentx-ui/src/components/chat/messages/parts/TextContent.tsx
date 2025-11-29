import { MarkdownText } from "~/components/typography/MarkdownText";

export interface TextContentProps {
  /**
   * Text content (supports Markdown)
   */
  text: string;

  /**
   * Whether this text is currently streaming
   */
  isStreaming?: boolean;
}

/**
 * TextContent - Render text with Markdown support
 *
 * @example
 * ```tsx
 * <TextContent text="Hello **world**" />
 * <TextContent text="Streaming..." isStreaming />
 * ```
 */
export function TextContent({ text, isStreaming = false }: TextContentProps) {
  return (
    <div className="w-full text-sm text-black">
      <MarkdownText>{text}</MarkdownText>

      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-blue-600 dark:bg-blue-500 animate-pulse ml-1 align-middle">
          ▋
        </span>
      )}
    </div>
  );
}
