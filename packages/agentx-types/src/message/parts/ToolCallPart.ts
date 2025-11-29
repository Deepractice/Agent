/**
 * Tool Call Part
 *
 * AI's request to invoke a tool.
 */
export interface ToolCallPart {
  /** Content type discriminator */
  type: "tool-call";

  /** Unique identifier for this tool call */
  id: string;

  /** Tool name */
  name: string;

  /** Tool input parameters */
  input: Record<string, unknown>;
}
