/**
 * LLM Provider abstraction
 *
 * Defines the capabilities and metadata of a language model provider.
 * Provider-agnostic design allows supporting multiple LLM vendors.
 */
export interface LLMProvider {
  /**
   * Provider name (e.g., "anthropic", "openai", "custom")
   */
  provider: string;

  /**
   * Provider-specific model identifier
   * Examples: "claude-3-5-sonnet-20241022", "gpt-4-turbo"
   */
  modelId: string;

  /**
   * Whether the model supports streaming output
   */
  supportsStreaming: boolean;

  /**
   * Whether the model supports tool calling
   */
  supportsTools: boolean;

  /**
   * Whether the model supports vision/image inputs
   */
  supportsVision: boolean;

  /**
   * Whether the model supports prompt caching
   */
  supportsCaching: boolean;

  /**
   * Whether the model supports extended thinking
   */
  supportsThinking?: boolean;
}
