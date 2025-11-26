import type { ContentPart } from "~/message/parts/ContentPart";
import type { TextPart } from "~/message/parts/TextPart";
import type { ThinkingPart } from "~/message/parts/ThinkingPart";
import type { ImagePart } from "~/message/parts/ImagePart";
import type { FilePart } from "~/message/parts/FilePart";
import type { ToolCallPart } from "~/message/parts/ToolCallPart";
import type { ToolResultPart } from "~/message/parts/ToolResultPart";

/**
 * Type guard for TextPart
 */
export function isTextPart(part: ContentPart): part is TextPart {
  return part.type === "text";
}

/**
 * Type guard for ThinkingPart
 */
export function isThinkingPart(part: ContentPart): part is ThinkingPart {
  return part.type === "thinking";
}

/**
 * Type guard for ImagePart
 */
export function isImagePart(part: ContentPart): part is ImagePart {
  return part.type === "image";
}

/**
 * Type guard for FilePart
 */
export function isFilePart(part: ContentPart): part is FilePart {
  return part.type === "file";
}

/**
 * Type guard for ToolCallPart
 */
export function isToolCallPart(part: ContentPart): part is ToolCallPart {
  return part.type === "tool-call";
}

/**
 * Type guard for ToolResultPart
 */
export function isToolResultPart(part: ContentPart): part is ToolResultPart {
  return part.type === "tool-result";
}
