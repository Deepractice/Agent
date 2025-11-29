/**
 * ClaudeSDKDriver Configuration Schema
 *
 * Defines the user-facing configuration for ClaudeSDKDriver using ADK.
 */

import { defineConfig } from "@deepractice-ai/agentx-adk";

/**
 * Claude SDK Driver configuration schema
 */
export const claudeSDKConfig = defineConfig({
  /**
   * Anthropic API key
   *
   * Required for authentication with Anthropic's API.
   * Can be provided via ANTHROPIC_API_KEY environment variable.
   */
  apiKey: {
    type: "string",
    scope: "instance",
    required: true,
    fromEnv: "ANTHROPIC_API_KEY",
    sensitive: true,
    description: "Anthropic API key for authentication",
  },

  /**
   * Claude model identifier
   *
   * Defaults to claude-sonnet-4-20250514.
   * Can be overridden at instance creation.
   */
  model: {
    type: "string",
    scope: "definition",
    overridable: true,
    default: "claude-sonnet-4-20250514",
    description: "Claude model identifier",
  },

  /**
   * System prompt
   *
   * Instructions for the AI's behavior and personality.
   * Set at definition time, can be overridden at instance time.
   */
  systemPrompt: {
    type: "string",
    scope: "definition",
    overridable: true,
    description: "System prompt for the agent",
  },

  /**
   * Maximum output tokens
   *
   * Limits the length of the AI's response.
   */
  maxTokens: {
    type: "number",
    scope: "definition",
    overridable: true,
    default: 4096,
    description: "Maximum number of tokens in the response",
  },

  /**
   * Temperature (0.0 - 1.0)
   *
   * Controls randomness in responses.
   * Lower values are more deterministic.
   */
  temperature: {
    type: "number",
    scope: "definition",
    overridable: true,
    description: "Sampling temperature (0.0 - 1.0)",
  },

  /**
   * Top-p sampling
   *
   * Alternative to temperature for controlling randomness.
   */
  topP: {
    type: "number",
    scope: "definition",
    overridable: true,
    description: "Top-p sampling parameter",
  },

  /**
   * Top-k sampling
   *
   * Limits the number of tokens considered for each step.
   */
  topK: {
    type: "number",
    scope: "definition",
    overridable: true,
    description: "Top-k sampling parameter",
  },
} as const);
