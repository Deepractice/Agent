/**
 * ClaudeSDKDriver
 *
 * AgentDriver implementation using @anthropic-ai/claude-agent-sdk.
 * Built with defineDriver for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { ClaudeSDKDriver } from "@deepractice-ai/agentx-framework/drivers";
 *
 * const agent = defineAgent({
 *   name: "Claude",
 *   driver: ClaudeSDKDriver,
 *   config: defineConfig({
 *     apiKey: { type: "string", required: true },
 *     model: { type: "string", default: "claude-3-5-sonnet-20241022" }
 *   })
 * });
 * ```
 */

import {
  query,
  type SDKMessage,
  type SDKAssistantMessage,
  type SDKPartialAssistantMessage,
  type Options,
  type CanUseTool,
  type HookEvent,
  type HookCallbackMatcher,
  type SdkPluginConfig,
} from "@anthropic-ai/claude-agent-sdk";
import { StreamEventBuilder } from "@deepractice-ai/agentx-core";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import { defineDriver } from "../defineDriver";

/**
 * Configuration for ClaudeSDKDriver
 */
export interface ClaudeSDKDriverConfig {
  // ==================== Basic Configuration ====================
  apiKey?: string;
  baseUrl?: string;
  cwd?: string;
  env?: Record<string, string>;

  // ==================== Model Configuration ====================
  model?: string;
  fallbackModel?: string;
  systemPrompt?: string | { type: "preset"; preset: "claude_code"; append?: string };

  // ==================== Tokens Control ====================
  maxTurns?: number;
  maxThinkingTokens?: number;

  // ==================== Session Management ====================
  continue?: boolean;
  resume?: string;
  forkSession?: boolean;

  // ==================== Permission Control ====================
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan";
  canUseTool?: CanUseTool;
  permissionPromptToolName?: string;

  // ==================== Tool Configuration ====================
  allowedTools?: string[];
  disallowedTools?: string[];

  // ==================== Directory Access ====================
  additionalDirectories?: string[];

  // ==================== MCP Servers ====================
  mcpServers?: Record<string, any>;
  strictMcpConfig?: boolean;

  // ==================== Subagents ====================
  agents?: Record<string, any>;

  // ==================== Settings Loading ====================
  settingSources?: ("user" | "project" | "local")[];

  // ==================== Plugins ====================
  plugins?: SdkPluginConfig[];

  // ==================== Runtime ====================
  executable?: "bun" | "deno" | "node";
  executableArgs?: string[];
  pathToClaudeCodeExecutable?: string;

  // ==================== Streaming Output ====================
  includePartialMessages?: boolean;

  // ==================== Callbacks ====================
  stderr?: (data: string) => void;

  // ==================== Hooks ====================
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;

  // ==================== Other ====================
  extraArgs?: Record<string, string | null>;
  abortController?: AbortController;
}

/**
 * Helper: Build prompt from UserMessage
 */
function buildPrompt(message: UserMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }

  return "";
}

/**
 * Helper: Build SDK options from config
 */
function buildOptions(config: ClaudeSDKDriverConfig, abortController: AbortController): Options {
  const options: Options = {
    abortController,
    includePartialMessages: config.includePartialMessages ?? true,
  };

  if (config.cwd) options.cwd = config.cwd;

  // Build env - merge process.env, user config, and custom values
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,  // Inherit system env (PATH, etc)
    ...config.env,  // User-provided env overrides
  };
  if (config.baseUrl) {
    env.ANTHROPIC_BASE_URL = config.baseUrl;
  }
  options.env = env;

  // Use current Node.js executable (works with nvm, volta, etc)
  if (!config.executable) {
    options.executable = process.execPath as any;  // SDK accepts full path despite type definition
  }
  if (config.model) options.model = config.model;
  if (config.fallbackModel) options.fallbackModel = config.fallbackModel;
  if (config.systemPrompt) options.systemPrompt = config.systemPrompt;
  if (config.maxTurns) options.maxTurns = config.maxTurns;
  if (config.maxThinkingTokens) options.maxThinkingTokens = config.maxThinkingTokens;
  if (config.continue !== undefined) options.continue = config.continue;
  if (config.resume) options.resume = config.resume;
  if (config.forkSession) options.forkSession = config.forkSession;
  if (config.permissionMode) options.permissionMode = config.permissionMode;
  if (config.canUseTool) options.canUseTool = config.canUseTool;
  if (config.permissionPromptToolName) options.permissionPromptToolName = config.permissionPromptToolName;
  if (config.allowedTools) options.allowedTools = config.allowedTools;
  if (config.disallowedTools) options.disallowedTools = config.disallowedTools;
  if (config.additionalDirectories) options.additionalDirectories = config.additionalDirectories;
  if (config.mcpServers) options.mcpServers = config.mcpServers;
  if (config.strictMcpConfig !== undefined) options.strictMcpConfig = config.strictMcpConfig;
  if (config.agents) options.agents = config.agents;
  if (config.settingSources) options.settingSources = config.settingSources;
  if (config.plugins) options.plugins = config.plugins;
  if (config.executable) options.executable = config.executable;
  if (config.executableArgs) options.executableArgs = config.executableArgs;
  if (config.pathToClaudeCodeExecutable) options.pathToClaudeCodeExecutable = config.pathToClaudeCodeExecutable;
  if (config.stderr) options.stderr = config.stderr;
  if (config.hooks) options.hooks = config.hooks;
  if (config.extraArgs) options.extraArgs = config.extraArgs;

  return options;
}

/**
 * Helper: Process complete assistant message content
 */
async function* processAssistantContent(
  sdkMsg: SDKAssistantMessage,
  builder: StreamEventBuilder
): AsyncIterable<StreamEventType> {
  const content = sdkMsg.message.content;

  for (let i = 0; i < content.length; i++) {
    const block = content[i];

    if (block.type === "text") {
      yield builder.textContentBlockStart(i);
      yield builder.textDelta(block.text, i);
      yield builder.textContentBlockStop(i);
    } else if (block.type === "tool_use") {
      yield builder.toolUseContentBlockStart(block.id, block.name, i);
      yield builder.inputJsonDelta(JSON.stringify(block.input), i);
      yield builder.toolUseContentBlockStop(block.id, i);
      // Emit high-level tool_call event (complete tool call assembled)
      yield builder.toolCall(block.id, block.name, block.input);
    }
  }
}

/**
 * Helper: Process streaming event
 */
async function* processStreamEvent(
  sdkMsg: SDKPartialAssistantMessage,
  builder: StreamEventBuilder
): AsyncIterable<StreamEventType> {
  const event = sdkMsg.event;

  switch (event.type) {
    case "message_start":
      yield builder.messageStart(event.message.id, event.message.model);
      break;

    case "content_block_start":
      if (event.content_block.type === "text") {
        yield builder.textContentBlockStart(event.index);
      } else if (event.content_block.type === "tool_use") {
        yield builder.toolUseContentBlockStart(
          event.content_block.id,
          event.content_block.name,
          event.index
        );
      }
      break;

    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        yield builder.textDelta(event.delta.text, event.index);
      } else if (event.delta.type === "input_json_delta") {
        yield builder.inputJsonDelta(event.delta.partial_json, event.index);
      }
      break;

    case "content_block_stop":
      yield builder.textContentBlockStop(event.index);
      // Note: tool_call event will be emitted by AgentMessageAssembler
      // after it parses the complete JSON input
      break;

    case "message_delta":
      if (event.delta.stop_reason) {
        // Claude SDK returns stop_reason as string, cast to StopReason
        yield builder.messageDelta(event.delta.stop_reason as any, event.delta.stop_sequence || undefined);
      }
      break;

    case "message_stop":
      yield builder.messageStop();
      break;

    default:
      break;
  }
}

/**
 * Helper: Transform Claude SDK messages to AgentX Stream events
 */
async function* transformSDKMessages(
  sdkMessages: AsyncIterable<SDKMessage>,
  builder: StreamEventBuilder
): AsyncIterable<StreamEventType> {
  let messageId: string | null = null;
  let hasStartedMessage = false;

  for await (const sdkMsg of sdkMessages) {
    switch (sdkMsg.type) {
      case "system":
        // Ignore system messages for now
        break;

      case "assistant":
        // Check if this is a synthetic error message from Claude SDK
        if (sdkMsg.message.model === "<synthetic>") {
          // Extract error text from content
          const errorText = sdkMsg.message.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join(" ");

          // Throw error instead of yielding as assistant message
          throw new Error(`Claude SDK error: ${errorText}`);
        }

        // Normal assistant message processing
        messageId = sdkMsg.message.id;
        if (!hasStartedMessage) {
          yield builder.messageStart(messageId, sdkMsg.message.model);
          hasStartedMessage = true;
        }

        yield* processAssistantContent(sdkMsg, builder);
        yield builder.messageStop();
        hasStartedMessage = false;
        break;

      case "stream_event":
        yield* processStreamEvent(sdkMsg, builder);
        if (!hasStartedMessage && sdkMsg.event.type === "message_start") {
          hasStartedMessage = true;
        }
        if (sdkMsg.event.type === "message_stop") {
          hasStartedMessage = false;
        }
        break;

      case "result":
        // Check if SDK returned an error
        if (sdkMsg.subtype !== "success") {
          throw new Error(`Claude SDK error: ${sdkMsg.subtype}`);
        }
        break;

      case "user":
        // Handle tool result blocks from Claude SDK
        if (sdkMsg.message && Array.isArray(sdkMsg.message.content)) {
          for (const block of sdkMsg.message.content) {
            if (block.type === "tool_result") {
              // Tool execution result from Claude SDK
              yield builder.toolResult(
                block.tool_use_id,
                block.content,
                block.is_error || false
              );
            }
          }
        }
        break;

      default:
        console.warn("[ClaudeSDKDriver] Unknown SDK message type:", sdkMsg);
    }
  }
}

/**
 * ClaudeSDKDriver - Built with defineDriver
 */
export const ClaudeSDKDriver = defineDriver<ClaudeSDKDriverConfig>({
  name: "ClaudeSDK",

  async *sendMessage(message, config) {
    // 1. Create shared resources
    const agentId = `claude_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const builder = new StreamEventBuilder(agentId);
    const abortController = config.abortController || new AbortController();

    // 2. Normalize input to AsyncIterable
    const messages = Symbol.asyncIterator in Object(message)
      ? (message as AsyncIterable<UserMessage>)
      : (async function* () { yield message as UserMessage; })();

    // 3. Process each message sequentially
    let isFirstMessage = true;

    for await (const msg of messages) {
      // Build prompt from message
      const prompt = buildPrompt(msg);

      // Build SDK options (use continue: true for subsequent messages)
      const options = buildOptions(
        { ...config, continue: !isFirstMessage },
        abortController
      );

      try {
        // Call Claude SDK
        const result = query({ prompt, options });

        // Transform SDK messages to Stream events
        yield* transformSDKMessages(result, builder);

        // Mark subsequent messages to use continue mode
        isFirstMessage = false;
      } catch (error) {
        console.error("[ClaudeSDKDriver] Error during SDK query:", error);
        throw error;
      }
    }
  },

  onDestroy: () => {
    console.log("[ClaudeSDKDriver] Destroyed");
  },
});
