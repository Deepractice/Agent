import type { TextPart } from "./TextPart";
import type { ThinkingPart } from "./ThinkingPart";
import type { ImagePart } from "./ImagePart";
import type { FilePart } from "./FilePart";
import type { ToolCallPart } from "./ToolCallPart";
import type { ToolResultPart } from "./ToolResultPart";

/**
 * Content Part
 *
 * Discriminated union of all content part types.
 * Used in messages to support multi-modal and complex content.
 */
export type ContentPart =
  | TextPart
  | ThinkingPart
  | ImagePart
  | FilePart
  | ToolCallPart
  | ToolResultPart;
