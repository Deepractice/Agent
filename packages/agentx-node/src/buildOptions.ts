/* eslint-disable no-undef */
/**
 * Build Claude SDK Options from AgentContext
 *
 * Converts AgentX AgentContext configuration to Claude SDK Options format.
 */

import type { AgentContext } from "@deepractice-ai/agentx-types";
import type {
  Options,
  CanUseTool,
  HookEvent,
  HookCallbackMatcher,
  SdkPluginConfig,
} from "@anthropic-ai/claude-agent-sdk";

/**
 * Build Claude SDK options from AgentContext
 */
export function buildOptions(
  context: AgentContext<Record<string, unknown>>,
  abortController: AbortController
): Options {
  const options: Options = {
    abortController,
    includePartialMessages: (context.includePartialMessages as boolean) ?? true,
  };

  // Working directory
  if (context.cwd) {
    options.cwd = context.cwd as string;
  }

  // Environment variables
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...(context.env as Record<string, string> | undefined),
  };
  if (context.baseUrl) {
    env.ANTHROPIC_BASE_URL = context.baseUrl as string;
  }
  if (context.apiKey) {
    env.ANTHROPIC_API_KEY = context.apiKey as string;
  }
  options.env = env;

  // Executable configuration
  if (!context.executable) {
    options.executable = process.execPath as any;
  } else {
    options.executable = context.executable as "bun" | "deno" | "node";
  }

  // Model configuration
  if (context.model) options.model = context.model as string;
  if (context.fallbackModel) options.fallbackModel = context.fallbackModel as string;
  if (context.systemPrompt) {
    options.systemPrompt = context.systemPrompt as
      | string
      | { type: "preset"; preset: "claude_code"; append?: string };
  }
  if (context.maxTurns) options.maxTurns = context.maxTurns as number;
  if (context.maxThinkingTokens) options.maxThinkingTokens = context.maxThinkingTokens as number;

  // Session control
  if (context.continue !== undefined) options.continue = context.continue as boolean;
  if (context.resume) options.resume = context.resume as string;
  if (context.forkSession) options.forkSession = context.forkSession as boolean;

  // Permission system
  if (context.permissionMode) {
    options.permissionMode = context.permissionMode as
      | "default"
      | "acceptEdits"
      | "bypassPermissions"
      | "plan";
  }
  if (context.canUseTool) options.canUseTool = context.canUseTool as CanUseTool;
  if (context.permissionPromptToolName) {
    options.permissionPromptToolName = context.permissionPromptToolName as string;
  }

  // Tool control
  if (context.allowedTools) options.allowedTools = context.allowedTools as string[];
  if (context.disallowedTools) options.disallowedTools = context.disallowedTools as string[];
  if (context.additionalDirectories) {
    options.additionalDirectories = context.additionalDirectories as string[];
  }

  // Integrations
  if (context.mcpServers) options.mcpServers = context.mcpServers as Record<string, any>;
  if (context.strictMcpConfig !== undefined) {
    options.strictMcpConfig = context.strictMcpConfig as boolean;
  }
  if (context.agents) options.agents = context.agents as Record<string, any>;
  if (context.settingSources) {
    options.settingSources = context.settingSources as ("user" | "project" | "local")[];
  }
  if (context.plugins) options.plugins = context.plugins as SdkPluginConfig[];

  // Runtime options
  if (context.executableArgs) options.executableArgs = context.executableArgs as string[];
  if (context.pathToClaudeCodeExecutable) {
    options.pathToClaudeCodeExecutable = context.pathToClaudeCodeExecutable as string;
  }
  if (context.stderr) options.stderr = context.stderr as (data: string) => void;
  if (context.hooks) {
    options.hooks = context.hooks as Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  }
  if (context.extraArgs) options.extraArgs = context.extraArgs as Record<string, string | null>;

  return options;
}
