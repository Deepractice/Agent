import type { ToolResultOutput } from "./ToolResultOutput";

/**
 * Tool Result Part
 *
 * Result of tool execution.
 */
export interface ToolResultPart {
  /** Content type discriminator */
  type: "tool-result";

  /** Tool call ID this result corresponds to */
  id: string;

  /** Tool name */
  name: string;

  /** Tool execution output */
  output: ToolResultOutput;
}
