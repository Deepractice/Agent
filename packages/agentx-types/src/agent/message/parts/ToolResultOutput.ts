import type { TextPart } from "./TextPart";
import type { ImagePart } from "./ImagePart";
import type { FilePart } from "./FilePart";

/**
 * Tool Result Output
 *
 * Enhanced tool result format supporting multiple output types.
 * Based on Vercel AI SDK and industry best practices.
 */
export type ToolResultOutput =
  /**
   * Plain text result
   */
  | {
      type: "text";
      value: string;
    }

  /**
   * JSON result
   */
  | {
      type: "json";
      value: unknown;
    }

  /**
   * Text error
   */
  | {
      type: "error-text";
      value: string;
    }

  /**
   * JSON error
   */
  | {
      type: "error-json";
      value: unknown;
    }

  /**
   * User denied tool execution
   */
  | {
      type: "execution-denied";
      reason?: string;
    }

  /**
   * Rich content (multiple parts)
   */
  | {
      type: "content";
      value: Array<TextPart | ImagePart | FilePart>;
    };
