/**
 * ClaudeSDKOptions - Internal programming interface for Claude SDK Driver
 *
 * This file defines the options accepted by the Claude Agent SDK.
 * Users don't interact with this directly - they pass config via AgentContext.
 *
 * @see https://docs.anthropic.com/claude/docs/agent-sdk-reference-typescript
 * @internal
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
 * Claude SDK Options
 *
 * Complete configuration options for the Claude Agent SDK.
 * Maps to the Options type from @anthropic-ai/claude-agent-sdk.
 */
export interface ClaudeSDKOptions {
  // ==================== Core Configuration ====================

  /**
   * Abort controller for cancelling operations
   * @default new AbortController()
   */
  abortController?: AbortController;

  /**
   * Current working directory
   * @default process.cwd()
   * @example "/workspace/myproject"
   */
  cwd?: string;

  /**
   * Environment variables to inject into the agent's runtime
   * @default process.env
   * @example { ANTHROPIC_API_KEY: "sk-xxx", CUSTOM_VAR: "value" }
   */
  env?: Record<string, string>;

  // ==================== Model Configuration ====================

  /**
   * Claude model identifier to use
   * @default Auto-detected from environment
   * @example "claude-sonnet-4-5-20250929"
   * @example "claude-opus-4-5-20251101"
   */
  model?: string;

  /**
   * Fallback model to use if primary model fails
   * @example "claude-sonnet-4-20250514"
   */
  fallbackModel?: string;

  /**
   * System prompt configuration
   *
   * Pass a string for custom prompt, or use preset object to load Claude Code's system prompt.
   * When using preset, you can append additional instructions.
   *
   * @default undefined (empty prompt)
   * @example "You are a helpful coding assistant."
   * @example { type: 'preset', preset: 'claude_code' }
   * @example { type: 'preset', preset: 'claude_code', append: 'Focus on TypeScript.' }
   */
  systemPrompt?: string | { type: "preset"; preset: "claude_code"; append?: string };

  /**
   * Maximum conversation turns before stopping
   * @example 10
   */
  maxTurns?: number;

  /**
   * Maximum tokens allocated for thinking process (extended thinking)
   * @example 10000
   */
  maxThinkingTokens?: number;

  /**
   * Include partial/streaming message events
   * @default false
   */
  includePartialMessages?: boolean;

  // ==================== Session Control ====================

  /**
   * Continue the most recent conversation
   * @default false
   */
  continue?: boolean;

  /**
   * Session ID to resume from a previous session
   * @example "session_abc123"
   */
  resume?: string;

  /**
   * When resuming with `resume`, fork to a new session ID instead of continuing the original session
   * @default false
   */
  forkSession?: boolean;

  // ==================== Permission System ====================

  /**
   * Permission mode for the session
   *
   * - `default`: Standard permission behavior (prompts user)
   * - `acceptEdits`: Auto-accept file edits
   * - `bypassPermissions`: Bypass all permission checks
   * - `plan`: Planning mode - no execution
   *
   * @default "default"
   */
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan";

  /**
   * Custom permission function for controlling tool usage
   *
   * Allows programmatic control over tool execution permissions.
   *
   * @example
   * async (toolName, input, options) => {
   *   if (toolName === "Bash" && input.command.includes("rm -rf")) {
   *     return { behavior: "deny", message: "Dangerous command blocked" };
   *   }
   *   return { behavior: "allow", updatedInput: input };
   * }
   */
  canUseTool?: CanUseTool;

  /**
   * MCP tool name for permission prompts
   *
   * Specifies which MCP tool should handle permission prompt dialogs.
   */
  permissionPromptToolName?: string;

  // ==================== Tool Control ====================

  /**
   * Whitelist of allowed tool names
   *
   * If specified, only these tools can be used.
   *
   * @default All tools allowed
   * @example ["Bash", "Read", "Write", "Edit"]
   */
  allowedTools?: string[];

  /**
   * Blacklist of disallowed tool names
   *
   * These tools will be explicitly blocked.
   *
   * @default []
   * @example ["WebSearch", "WebFetch"]
   */
  disallowedTools?: string[];

  /**
   * Additional directories Claude can access
   *
   * Expands the file system access beyond the working directory.
   *
   * @default []
   * @example ["/home/user/Documents", "/var/log"]
   */
  additionalDirectories?: string[];

  // ==================== Integrations ====================

  /**
   * MCP (Model Context Protocol) server configurations
   *
   * Define external MCP servers that provide tools, resources, and prompts.
   *
   * @default {}
   * @example
   * {
   *   filesystem: {
   *     command: "npx",
   *     args: ["@modelcontextprotocol/server-filesystem", "/path/to/files"]
   *   },
   *   github: {
   *     type: "sse",
   *     url: "https://mcp.example.com/github",
   *     headers: { "Authorization": "Bearer token" }
   *   }
   * }
   */
  mcpServers?: Record<string, any>;

  /**
   * Enforce strict MCP validation
   *
   * When true, MCP configuration errors will cause failures.
   *
   * @default false
   */
  strictMcpConfig?: boolean;

  /**
   * Programmatically define subagents
   *
   * Create specialized agents for specific tasks.
   *
   * @example
   * {
   *   reviewer: {
   *     description: "Code review specialist",
   *     tools: ["Read", "Grep"],
   *     prompt: "You are a senior code reviewer.",
   *     model: "opus"
   *   }
   * }
   */
  agents?: Record<string, any>;

  /**
   * Control which filesystem settings to load
   *
   * - `user`: Global user settings (~/.claude/settings.json)
   * - `project`: Project settings (.claude/settings.json)
   * - `local`: Local settings (.claude/settings.local.json)
   *
   * When omitted or empty, no filesystem settings are loaded.
   * Must include `project` to load CLAUDE.md files.
   *
   * @default [] (no settings loaded)
   * @example ["project"] // Only load project settings
   * @example ["user", "project", "local"] // Load all settings
   */
  settingSources?: ("user" | "project" | "local")[];

  /**
   * Load custom plugins from local paths
   *
   * @default []
   * @example [{ type: "local", path: "./my-plugin" }]
   * @see https://docs.anthropic.com/claude/docs/plugins
   */
  plugins?: SdkPluginConfig[];

  // ==================== Runtime Options ====================

  /**
   * JavaScript runtime to use
   *
   * @default Auto-detected
   * @example "node"
   * @example "bun"
   * @example "deno"
   */
  executable?: "bun" | "deno" | "node";

  /**
   * Arguments to pass to the JavaScript executable
   *
   * @default []
   * @example ["--experimental-modules", "--trace-warnings"]
   */
  executableArgs?: string[];

  /**
   * Path to Claude Code executable
   *
   * @default Auto-detected
   * @example "/usr/local/bin/claude"
   */
  pathToClaudeCodeExecutable?: string;

  /**
   * Callback for standard error output
   *
   * Receives stderr output from tool executions.
   *
   * @example (data) => console.error("[STDERR]", data)
   */
  stderr?: (data: string) => void;

  // ==================== Hooks and Extensions ====================

  /**
   * Hook callbacks for lifecycle events
   *
   * Attach custom handlers to SDK events like PreToolUse, PostToolUse, etc.
   *
   * @default {}
   * @example
   * {
   *   PreToolUse: [{
   *     matcher: "Bash",
   *     hooks: [async (input) => {
   *       console.log("About to run:", input.tool_input.command);
   *       return { continue: true };
   *     }]
   *   }]
   * }
   */
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;

  /**
   * Additional arguments for SDK extensions
   *
   * Pass extra configuration to plugins or custom integrations.
   *
   * @default {}
   */
  extraArgs?: Record<string, string | null>;
}

/**
 * Build Claude SDK Options from AgentContext
 *
 * Converts AgentX user config into Claude SDK's Options format.
 * This is the adapter layer between AgentX and Claude SDK.
 *
 * @param context - Agent context containing user config
 * @param abortController - Abort controller for cancellation
 * @returns Options compatible with Claude SDK's query() function
 *
 * @internal
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
