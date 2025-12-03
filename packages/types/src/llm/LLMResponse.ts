import type { ContentPart } from "~/agent/message/parts/ContentPart";
import type { TokenUsage } from "./TokenUsage";
import type { StopReason } from "./StopReason";

/**
 * Complete LLM inference response (stateless)
 *
 * Contains everything returned from a single LLM inference call.
 * Given the same LLMRequest (with temperature=0), the response should be reproducible.
 */
export interface LLMResponse {
  /**
   * Generated content
   * Can be text, thinking, tool calls, etc.
   */
  content: string | ContentPart[];

  /**
   * Why the model stopped generating
   */
  stopReason: StopReason;

  /**
   * Token usage statistics
   */
  usage: TokenUsage;

  /**
   * When the generation finished
   */
  finishTime: Date;

  /**
   * Model that generated this response
   */
  model?: string;
}
