/**
 * ClaudeSDKDriver
 *
 * AgentDriver implementation using @anthropic-ai/claude-agent-sdk.
 * Built with defineDriver for minimal boilerplate.
 *
 * Performance Optimization:
 * - Uses Claude SDK's Streaming Input Mode (prompt: AsyncIterable)
 * - Process starts once and stays alive for entire session
 * - First message: ~6-7s (process startup)
 * - Subsequent messages: ~1-2s (3-5x faster!)
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
  type SDKUserMessage,
  type SDKAssistantMessage,
  type SDKPartialAssistantMessage,
  type Options,
  type CanUseTool,
  type HookEvent,
  type HookCallbackMatcher,
  type SdkPluginConfig,
  type Query,
} from "@anthropic-ai/claude-agent-sdk";
import { StreamEventBuilder } from "@deepractice-ai/agentx-core";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import { LoggerFactory } from "@deepractice-ai/agentx-logger";
import { defineDriver } from "@deepractice-ai/agentx-framework";
import { observableToAsyncIterable } from "~/utils/observableToAsyncIterable";
import { Subject } from "rxjs";

// Create logger for ClaudeSDKDriver
const logger = LoggerFactory.getLogger("ClaudeSDKDriver");

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

  // ==================== Internal (Framework) ====================
  sessionId?: string;  // Framework session ID (for session mapping)
}

/**
 * Shared state for ClaudeSDKDriver instances (per driver definition)
 */
interface DriverState {
  promptSubject: Subject<SDKUserMessage>;  // Input: sendMessage pushes SDK-formatted messages
  responseSubject: Subject<SDKMessage>;  // Output: broadcasts responses to all consumers
  claudeQuery: Query | null;
  abortController: AbortController;
  sessionMap: Map<string, string>; // Framework sessionId -> Claude SDK session_id
  isInitialized: boolean;
  config: ClaudeSDKDriverConfig;
  agentId: string;
}

// Global state storage (one per driver definition)
const driverStates = new WeakMap<any, DriverState>();

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
      .map((part) => (part as any).text)
      .join("\n");
  }

  return "";
}

/**
 * Helper: Build SDKUserMessage from UserMessage
 */
function buildSDKUserMessage(message: UserMessage, sessionId: string): SDKUserMessage {
  const prompt = buildPrompt(message);

  return {
    type: "user",
    message: {
      role: "user",
      content: prompt,
    },
    parent_tool_use_id: null,
    session_id: sessionId,
  };
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
  if (config.apiKey) {
    env.ANTHROPIC_API_KEY = config.apiKey;
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
 * Returns captured Claude SDK session_id via callback
 */
async function* transformSDKMessages(
  sdkMessages: AsyncIterable<SDKMessage>,
  builder: StreamEventBuilder,
  onSessionIdCaptured?: (sessionId: string) => void
): AsyncIterable<StreamEventType> {
  let messageId: string | null = null;
  let hasStartedMessage = false;

  for await (const sdkMsg of sdkMessages) {
    // Capture Claude SDK session_id
    if (sdkMsg.session_id && onSessionIdCaptured) {
      onSessionIdCaptured(sdkMsg.session_id);
    }

    switch (sdkMsg.type) {
      case "system":
        // Ignore system messages for now
        break;

      case "assistant":
        // Check if this is a synthetic error message from Claude SDK
        if (sdkMsg.message.model === "<synthetic>") {
          // Extract error text from content
          const errorText = sdkMsg.message.content
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join(" ");

          // Throw error instead of yielding as assistant message
          throw new Error(`Claude SDK error: ${errorText}`);
        }

        // Normal assistant message processing
        messageId = sdkMsg.message.id;
        if (!hasStartedMessage && messageId) {
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
        logger.warn("Unknown SDK message type:", sdkMsg);
    }
  }
}

/**
 * Get or create driver state for this driver definition
 */
function getDriverState(definition: any, config: ClaudeSDKDriverConfig): DriverState {
  if (!driverStates.has(definition)) {
    const state: DriverState = {
      promptSubject: new Subject<SDKUserMessage>(),
      responseSubject: new Subject<SDKMessage>(),
      claudeQuery: null,
      abortController: new AbortController(),
      sessionMap: new Map(),
      isInitialized: false,
      config,
      agentId: `claude_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    driverStates.set(definition, state);
  }
  return driverStates.get(definition)!;
}

/**
 * ClaudeSDKDriver - Built with defineDriver
 *
 * Uses Streaming Input Mode for optimal performance:
 * - onInit: Start Claude SDK process once
 * - sendMessage: Push messages to queue (SDK stays alive)
 * - onDestroy: Cleanup resources
 */
export const ClaudeSDKDriver = defineDriver<ClaudeSDKDriverConfig>({
  name: "ClaudeSDK",

  onInit: async (config) => {
    const state = getDriverState(ClaudeSDKDriver, config);

    if (state.isInitialized) {
      logger.debug("Already initialized (process reused)");
      return;
    }

    logger.info("========================================");
    logger.info("STREAMING INPUT MODE ENABLED");
    logger.info("Claude SDK process will start ONCE and stay alive");
    logger.info("========================================");
    logger.info("Configuration:", {
      model: config.model || "default",
      baseUrl: config.baseUrl || "default",
      cwd: config.cwd || "default",
      permissionMode: config.permissionMode || "default",
      maxTurns: config.maxTurns || "unlimited",
      mcpServers: config.mcpServers ? Object.keys(config.mcpServers).join(", ") : "none",
      systemPrompt: config.systemPrompt
        ? (typeof config.systemPrompt === "string"
            ? config.systemPrompt.substring(0, 50) + (config.systemPrompt.length > 50 ? "..." : "")
            : "preset")
        : "default",
    });
    logger.info("========================================");

    // Get stored Claude SDK session ID (if exists)
    const frameworkSessionId = config.sessionId;
    const claudeSessionId = frameworkSessionId ? state.sessionMap.get(frameworkSessionId) : undefined;

    if (claudeSessionId) {
      logger.info(`Resuming Claude session: ${claudeSessionId}`);
    }

    // Build SDK options
    const options = buildOptions(
      {
        ...config,
        resume: claudeSessionId,
      },
      state.abortController
    );

    // Convert Subject to AsyncIterable for Claude SDK
    const promptStream = observableToAsyncIterable(state.promptSubject);

    // Start Claude SDK with AsyncIterable prompt (Streaming Input Mode)
    state.claudeQuery = query({
      prompt: promptStream,
      options,
    });

    state.isInitialized = true;

    // Start background thread to forward responses to responseSubject
    (async () => {
      try {
        logger.debug("Background listener started (waiting for SDK responses)");
        for await (const sdkMsg of state.claudeQuery!) {
          // Capture session ID
          if (sdkMsg.session_id && frameworkSessionId) {
            state.sessionMap.set(frameworkSessionId, sdkMsg.session_id);
            logger.debug(`Captured Claude session_id: ${sdkMsg.session_id}`);
          }

          // Broadcast to all subscribers
          logger.debug(`Broadcasting SDK message (type: ${sdkMsg.type})`);
          state.responseSubject.next(sdkMsg);
        }

        // Query completed
        logger.info("Claude SDK query completed");
        state.responseSubject.complete();
      } catch (error) {
        logger.error("Background listener error:", { error: error instanceof Error ? error.message : String(error) });
        state.responseSubject.error(error);
      }
    })();

    logger.info("Streaming Input Mode initialized successfully");
    logger.debug("Claude SDK process is now RUNNING in background");
    logger.debug("Ready to handle messages with persistent process");
  },

  async *sendMessage(message, config) {
    const state = getDriverState(ClaudeSDKDriver, config);

    if (!state.isInitialized || !state.claudeQuery) {
      throw new Error("[ClaudeSDKDriver] Driver not initialized. Call onInit first.");
    }

    // 1. Normalize input to AsyncIterable
    const messages = Symbol.asyncIterator in Object(message)
      ? (message as AsyncIterable<UserMessage>)
      : (async function* () { yield message as UserMessage; })();

    // 2. Create builder for this message stream
    const builder = new StreamEventBuilder(state.agentId);

    // 3. Process each message
    for await (const msg of messages) {
      const sessionId = config.sessionId || state.agentId;

      // Build SDK user message
      const sdkUserMessage = buildSDKUserMessage(msg, sessionId);
      const prompt = buildPrompt(msg);

      // Push to Subject (Claude SDK reads from promptSubject)
      logger.debug("Pushing message to Subject (reusing existing process)");
      logger.debug(`Message: ${prompt.substring(0, 80)}...`);
      state.promptSubject.next(sdkUserMessage);

      // Subscribe to responseSubject (broadcast from background thread)
      // Auto-complete subscription after receiving result event (entire agentic flow done)
      const responseStream = (async function* () {
        for await (const sdkMsg of observableToAsyncIterable(state.responseSubject)) {
          yield sdkMsg;

          // Only stop after result event (entire exchange complete, including tool calls)
          // Do NOT stop after message_stop - that's just one turn, tool calls need multiple turns
          if (sdkMsg.type === "result") {
            logger.debug("Result received, stopping this subscription");
            break;
          }
        }
      })();

      // Transform SDK messages to Stream events
      yield* transformSDKMessages(
        responseStream,
        builder,
        (capturedSessionId) => {
          if (config.sessionId && capturedSessionId) {
            state.sessionMap.set(config.sessionId, capturedSessionId);
          }
        }
      );
    }
  },

  onDestroy: async () => {
    logger.info("Destroying driver (shutting down persistent process)...");
    const state = driverStates.get(ClaudeSDKDriver);

    if (state) {
      // Complete Subjects to stop all async operations
      state.promptSubject.complete();
      state.responseSubject.complete();

      // Abort SDK process
      state.abortController.abort();

      state.isInitialized = false;
      driverStates.delete(ClaudeSDKDriver);
      logger.debug("Claude SDK process terminated");
      logger.debug("Streaming Input Mode disabled");
    }

    logger.info("Driver destroyed");
  },
});
