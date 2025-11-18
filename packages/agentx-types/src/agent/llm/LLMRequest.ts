import type { Message } from "~/agent/message/Message";
import type { LLMConfig } from "./LLMConfig";

/**
 * Complete LLM inference request (stateless)
 *
 * Contains everything needed for a single LLM inference call.
 * The LLM is stateless - all context must be provided in messages.
 *
 * IMPORTANT: This does NOT include tool definitions.
 * Tools are external capabilities provided by the runtime environment.
 */
export interface LLMRequest {
  /**
   * Context messages
   * All conversation history that the LLM should consider
   */
  messages: Message[];

  /**
   * Inference configuration
   * Controls how the model generates responses
   */
  config: LLMConfig;

  /**
   * System prompt (optional)
   * High-level instructions that guide the model's behavior
   */
  systemPrompt?: string;
}
