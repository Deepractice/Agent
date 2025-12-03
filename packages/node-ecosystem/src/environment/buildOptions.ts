/**
 * Build Claude SDK Options from Environment Config
 *
 * Converts environment configuration to Claude SDK Options format.
 */

import type { Options } from "@anthropic-ai/claude-agent-sdk";

/**
 * Environment context for Claude SDK
 */
export interface EnvironmentContext {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  cwd?: string;
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan";
  resume?: string;
  maxTurns?: number;
  maxThinkingTokens?: number;
}

/**
 * Build Claude SDK options from environment context
 */
export function buildOptions(
  context: EnvironmentContext,
  abortController: AbortController
): Options {
  const options: Options = {
    abortController,
    includePartialMessages: true,
  };

  // Working directory
  if (context.cwd) {
    options.cwd = context.cwd;
  }

  // Environment variables
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
  };
  if (context.baseUrl) {
    env.ANTHROPIC_BASE_URL = context.baseUrl;
  }
  if (context.apiKey) {
    env.ANTHROPIC_API_KEY = context.apiKey;
  }
  options.env = env;

  // Executable
  options.executable = process.execPath as any;

  // Model configuration
  if (context.model) options.model = context.model;
  if (context.systemPrompt) options.systemPrompt = context.systemPrompt;
  if (context.maxTurns) options.maxTurns = context.maxTurns;
  if (context.maxThinkingTokens) options.maxThinkingTokens = context.maxThinkingTokens;

  // Session control
  if (context.resume) options.resume = context.resume;

  // Permission system
  if (context.permissionMode) {
    options.permissionMode = context.permissionMode;
  } else {
    // Default to bypass permissions (agent runs autonomously)
    options.permissionMode = "bypassPermissions";
  }

  return options;
}
