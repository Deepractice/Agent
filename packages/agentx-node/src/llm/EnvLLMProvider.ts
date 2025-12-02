/**
 * EnvLLMProvider - Environment-based LLM Provider
 *
 * Reads LLM configuration from environment variables.
 *
 * Environment Variables:
 * - LLM_PROVIDER_KEY (required) - API key for LLM provider
 * - LLM_PROVIDER_URL (optional) - Base URL for API endpoint
 * - LLM_PROVIDER_MODEL (optional) - Model name (default: claude-sonnet-4-20250514)
 *
 * @example
 * ```typescript
 * const provider = new EnvLLMProvider();
 * const { apiKey, baseUrl, model } = provider.provide();
 * ```
 */

import type { LLMProvider } from "@deepractice-ai/agentx-types";

/**
 * LLM Supply - Configuration provided by EnvLLMProvider
 */
export interface LLMSupply {
  /**
   * API key for LLM provider
   */
  apiKey: string;

  /**
   * Base URL for API endpoint (optional)
   */
  baseUrl?: string;

  /**
   * Model name
   */
  model: string;
}

/**
 * Default model if not specified
 */
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * EnvLLMProvider - Reads LLM config from environment variables
 *
 * Uses generic environment variable names for provider-agnostic configuration:
 * - LLM_PROVIDER_KEY - API key
 * - LLM_PROVIDER_URL - Base URL
 * - LLM_PROVIDER_MODEL - Model name
 */
export class EnvLLMProvider implements LLMProvider<LLMSupply> {
  readonly name = "env";

  /**
   * Provide LLM configuration from environment
   *
   * @throws Error if LLM_PROVIDER_KEY is not set
   */
  provide(): LLMSupply {
    const apiKey = process.env.LLM_PROVIDER_KEY;

    if (!apiKey) {
      throw new Error(
        "LLM_PROVIDER_KEY environment variable is required. " +
          "Set it to your LLM provider API key (e.g., Anthropic API key)."
      );
    }

    return {
      apiKey,
      baseUrl: process.env.LLM_PROVIDER_URL,
      model: process.env.LLM_PROVIDER_MODEL || DEFAULT_MODEL,
    };
  }
}
