/**
 * Thinking Part
 *
 * AI's reasoning/thinking process (extended thinking).
 */
export interface ThinkingPart {
  /** Content type discriminator */
  type: "thinking";

  /** The reasoning text */
  reasoning: string;

  /** Tokens used for thinking (optional) */
  tokenCount?: number;
}
