/**
 * MessageContent - Render message content with Markdown support
 *
 * Pure UI component that handles:
 * - String content (renders as Markdown)
 * - ContentPart array (extracts text and renders)
 * - Other content (renders as JSON)
 */

import * as React from "react";
import type { ContentPart } from "agentxjs";
import { MarkdownText } from "~/components/typography/MarkdownText";

export interface MessageContentProps {
  /**
   * Content to render
   * Can be string, ContentPart array, or any other structure
   */
  content: string | ContentPart[] | unknown;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Extract text from ContentPart array
 */
const extractTextFromContentParts = (content: unknown): string | null => {
  if (!Array.isArray(content)) return null;

  const textParts = content
    .filter(
      (part): part is { type: string; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
    )
    .map((part) => part.text);

  return textParts.length > 0 ? textParts.join("\n") : null;
};

/**
 * MessageContent Component
 */
export const MessageContent: React.FC<MessageContentProps> = ({ content, className }) => {
  // Handle string content
  if (typeof content === "string") {
    return (
      <div className={className}>
        <MarkdownText>{content}</MarkdownText>
      </div>
    );
  }

  // Handle ContentPart[] array (e.g., [{ type: "text", text: "..." }])
  const extractedText = extractTextFromContentParts(content);
  if (extractedText !== null) {
    return (
      <div className={className}>
        <MarkdownText>{extractedText}</MarkdownText>
      </div>
    );
  }

  // For other non-string content, render as JSON
  return (
    <div className={className}>
      <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
        {JSON.stringify(content, null, 2)}
      </pre>
    </div>
  );
};
