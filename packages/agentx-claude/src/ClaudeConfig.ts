/**
 * ClaudeSDKDriver Configuration Schema
 *
 * Defines the user-facing configuration for ClaudeSDKDriver using ADK.
 *
 * Configuration priority: instance > definition > container
 */

import { defineConfig } from "@deepractice-ai/agentx-adk";

/**
 * Claude SDK Driver configuration schema
 */
export const claudeSDKConfig = defineConfig({
  // ==================== Authentication & Connection ====================

  /**
   * Anthropic API key
   *
   * Required for authentication with Anthropic's API.
   * Container can provide via process.env.ANTHROPIC_API_KEY.
   */
  apiKey: {
    type: "string",
    scopes: ["instance", "container"],
    required: true,
    sensitive: true,
    description: "Anthropic API key for authentication",
  },

  /**
   * Anthropic API base URL
   *
   * Custom API endpoint (e.g., for relay servers).
   * Container can provide via process.env.ANTHROPIC_BASE_URL.
   */
  baseUrl: {
    type: "string",
    scopes: ["instance", "container"],
    description: "Anthropic API base URL for custom endpoints",
  },

  // ==================== Model Configuration ====================

  /**
   * Claude model identifier
   *
   * Defaults to claude-sonnet-4-20250514.
   * Can be set at definition or overridden at instance creation.
   */
  model: {
    type: "string",
    scopes: ["instance", "definition"],
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
    scopes: ["instance", "definition"],
    description: "System prompt for the agent",
  },

  // ==================== Conversation Control ====================

  /**
   * Maximum conversation turns
   *
   * Limits the number of turns to prevent infinite loops.
   */
  maxTurns: {
    type: "number",
    scopes: ["instance", "definition"],
    default: 25,
    description: "Maximum conversation turns before stopping",
  },

  /**
   * Maximum thinking tokens
   *
   * Maximum tokens allocated for extended thinking process.
   */
  maxThinkingTokens: {
    type: "number",
    scopes: ["instance", "definition"],
    description: "Maximum tokens for extended thinking",
  },

  // ==================== Permission Control ====================

  /**
   * Permission mode
   *
   * Controls how tool execution permissions are handled.
   */
  permissionMode: {
    type: "string",
    scopes: ["instance", "definition"],
    default: "default",
    description: "Permission mode: default, acceptEdits, bypassPermissions, or plan",
  },

  // ==================== Container-provided Configuration ====================

  /**
   * Current working directory
   *
   * Provided by AgentX container/runtime.
   */
  cwd: {
    type: "string",
    scopes: ["container"],
    description: "Current working directory (provided by container)",
  },

  /**
   * Environment variables
   *
   * Provided by AgentX container/runtime.
   */
  env: {
    type: "object",
    scopes: ["container"],
    description: "Environment variables (provided by container)",
  },

  /**
   * Abort controller
   *
   * Provided by AgentX container/runtime for cancellation.
   */
  abortController: {
    type: "object",
    scopes: ["container"],
    description: "Abort controller for cancellation (provided by container)",
  },

  /**
   * JavaScript executable
   *
   * Provided by AgentX container/runtime.
   */
  executable: {
    type: "string",
    scopes: ["container"],
    description: "JavaScript runtime executable (provided by container)",
  },

  /**
   * Include partial messages
   *
   * Whether to include partial/streaming message events.
   */
  includePartialMessages: {
    type: "boolean",
    scopes: ["container"],
    default: true,
    description: "Include partial message events in stream",
  },
} as const);
