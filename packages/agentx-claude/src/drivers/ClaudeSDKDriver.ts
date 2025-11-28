/**
 * ClaudeSDKDriver
 *
 * AgentDriver implementation using @anthropic-ai/claude-agent-sdk.
 *
 * @example
 * ```typescript
 * import { ClaudeDriver } from "@deepractice-ai/agentx-claude";
 *
 * const MyAgent = agentx.agents.define({
 *   name: "Assistant",
 *   driver: ClaudeDriver,
 * });
 *
 * const agent = agentx.agents.create(MyAgent, { apiKey: "xxx" });
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
import type {
  AgentDriver,
  AgentContext,
  UserMessage,
  StreamEventType,
  MessageStartEvent,
  MessageStopEvent,
  MessageDeltaEvent,
  TextContentBlockStartEvent,
  TextContentBlockStopEvent,
  TextDeltaEvent,
  ToolUseContentBlockStartEvent,
  ToolUseContentBlockStopEvent,
  InputJsonDeltaEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";
import { observableToAsyncIterable } from "~/utils/observableToAsyncIterable";
import { Subject } from "rxjs";

const logger = createLogger("ClaudeSDKDriver");

/**
 * Configuration for ClaudeSDKDriver
 */
export interface ClaudeSDKDriverConfig {
  apiKey?: string;
  baseUrl?: string;
  cwd?: string;
  env?: Record<string, string>;
  model?: string;
  fallbackModel?: string;
  systemPrompt?: string | { type: "preset"; preset: "claude_code"; append?: string };
  maxTurns?: number;
  maxThinkingTokens?: number;
  continue?: boolean;
  resume?: string;
  forkSession?: boolean;
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan";
  canUseTool?: CanUseTool;
  permissionPromptToolName?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  additionalDirectories?: string[];
  mcpServers?: Record<string, any>;
  strictMcpConfig?: boolean;
  agents?: Record<string, any>;
  settingSources?: ("user" | "project" | "local")[];
  plugins?: SdkPluginConfig[];
  executable?: "bun" | "deno" | "node";
  executableArgs?: string[];
  pathToClaudeCodeExecutable?: string;
  includePartialMessages?: boolean;
  stderr?: (data: string) => void;
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  extraArgs?: Record<string, string | null>;
  abortController?: AbortController;
}

/**
 * Driver state (per agent instance)
 */
interface DriverState {
  promptSubject: Subject<SDKUserMessage>;
  responseSubject: Subject<SDKMessage>;
  claudeQuery: Query | null;
  abortController: AbortController;
  sessionMap: Map<string, string>;
  isInitialized: boolean;
}

// State storage per agentId
const driverStates = new Map<string, DriverState>();

// ============================================================================
// Event Builders (inline, no external dependency)
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function createEventBase(agentId: string) {
  return {
    uuid: generateUUID(),
    agentId,
    timestamp: Date.now(),
  };
}

function messageStart(agentId: string, id: string, model: string): MessageStartEvent {
  return {
    ...createEventBase(agentId),
    type: "message_start",
    data: { message: { id, model } },
  };
}

function messageStop(agentId: string): MessageStopEvent {
  return {
    ...createEventBase(agentId),
    type: "message_stop",
    data: {},
  };
}

function messageDelta(agentId: string, stopReason: string, stopSequence?: string): MessageDeltaEvent {
  return {
    ...createEventBase(agentId),
    type: "message_delta",
    data: { delta: { stopReason: stopReason as any, stopSequence } },
  };
}

function textContentBlockStart(agentId: string): TextContentBlockStartEvent {
  return {
    ...createEventBase(agentId),
    type: "text_content_block_start",
    data: {},
  };
}

function textContentBlockStop(agentId: string): TextContentBlockStopEvent {
  return {
    ...createEventBase(agentId),
    type: "text_content_block_stop",
    data: {},
  };
}

function textDelta(agentId: string, text: string): TextDeltaEvent {
  return {
    ...createEventBase(agentId),
    type: "text_delta",
    data: { text },
  };
}

function toolUseContentBlockStart(
  agentId: string,
  toolId: string,
  toolName: string
): ToolUseContentBlockStartEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_use_content_block_start",
    data: { id: toolId, name: toolName },
  };
}

function toolUseContentBlockStop(agentId: string, toolId: string): ToolUseContentBlockStopEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_use_content_block_stop",
    data: { id: toolId },
  };
}

function inputJsonDelta(agentId: string, partialJson: string): InputJsonDeltaEvent {
  return {
    ...createEventBase(agentId),
    type: "input_json_delta",
    data: { partialJson },
  };
}

function toolCall(agentId: string, toolId: string, toolName: string, input: unknown): ToolCallEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_call",
    data: { id: toolId, name: toolName, input },
  };
}

function toolResult(agentId: string, toolId: string, content: string | any[], isError: boolean): ToolResultEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_result",
    data: { toolId, content, isError },
  };
}

// ============================================================================
// Helpers
// ============================================================================

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

function buildSDKUserMessage(message: UserMessage, sessionId: string): SDKUserMessage {
  return {
    type: "user",
    message: { role: "user", content: buildPrompt(message) },
    parent_tool_use_id: null,
    session_id: sessionId,
  };
}

function buildOptions(
  config: ClaudeSDKDriverConfig,
  abortController: AbortController
): Options {
  const options: Options = {
    abortController,
    includePartialMessages: config.includePartialMessages ?? true,
  };

  if (config.cwd) options.cwd = config.cwd;

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...config.env,
  };
  if (config.baseUrl) env.ANTHROPIC_BASE_URL = config.baseUrl;
  if (config.apiKey) env.ANTHROPIC_API_KEY = config.apiKey;
  options.env = env;

  if (!config.executable) {
    options.executable = process.execPath as any;
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
  if (config.permissionPromptToolName)
    options.permissionPromptToolName = config.permissionPromptToolName;
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
  if (config.pathToClaudeCodeExecutable)
    options.pathToClaudeCodeExecutable = config.pathToClaudeCodeExecutable;
  if (config.stderr) options.stderr = config.stderr;
  if (config.hooks) options.hooks = config.hooks;
  if (config.extraArgs) options.extraArgs = config.extraArgs;

  return options;
}

// ============================================================================
// SDK Message Processing
// ============================================================================

async function* processAssistantContent(
  agentId: string,
  sdkMsg: SDKAssistantMessage
): AsyncIterable<StreamEventType> {
  const content = sdkMsg.message.content;

  for (const block of content) {
    if (block.type === "text") {
      yield textContentBlockStart(agentId);
      yield textDelta(agentId, block.text);
      yield textContentBlockStop(agentId);
    } else if (block.type === "tool_use") {
      yield toolUseContentBlockStart(agentId, block.id, block.name);
      yield inputJsonDelta(agentId, JSON.stringify(block.input));
      yield toolUseContentBlockStop(agentId, block.id);
      yield toolCall(agentId, block.id, block.name, block.input);
    }
  }
}

async function* processStreamEvent(
  agentId: string,
  sdkMsg: SDKPartialAssistantMessage
): AsyncIterable<StreamEventType> {
  const event = sdkMsg.event;

  switch (event.type) {
    case "message_start":
      yield messageStart(agentId, event.message.id, event.message.model);
      break;

    case "content_block_start":
      if (event.content_block.type === "text") {
        yield textContentBlockStart(agentId);
      } else if (event.content_block.type === "tool_use") {
        yield toolUseContentBlockStart(
          agentId,
          event.content_block.id,
          event.content_block.name
        );
      }
      break;

    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        yield textDelta(agentId, event.delta.text);
      } else if (event.delta.type === "input_json_delta") {
        yield inputJsonDelta(agentId, event.delta.partial_json);
      }
      break;

    case "content_block_stop":
      yield textContentBlockStop(agentId);
      break;

    case "message_delta":
      if (event.delta.stop_reason) {
        yield messageDelta(agentId, event.delta.stop_reason, event.delta.stop_sequence || undefined);
      }
      break;

    case "message_stop":
      yield messageStop(agentId);
      break;
  }
}

async function* transformSDKMessages(
  agentId: string,
  sdkMessages: AsyncIterable<SDKMessage>,
  onSessionIdCaptured?: (sessionId: string) => void
): AsyncIterable<StreamEventType> {
  let hasStartedMessage = false;
  // Track if content was already processed via stream_event
  // When includePartialMessages=true, SDK sends both stream_event AND assistant message
  // We should only process content once (via stream_event for real-time updates)
  let hasProcessedViaStream = false;

  for await (const sdkMsg of sdkMessages) {
    if (sdkMsg.session_id && onSessionIdCaptured) {
      onSessionIdCaptured(sdkMsg.session_id);
    }

    switch (sdkMsg.type) {
      case "system":
        break;

      case "assistant":
        if (sdkMsg.message.model === "<synthetic>") {
          const errorText = sdkMsg.message.content
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join(" ");
          throw new Error(`Claude SDK error: ${errorText}`);
        }

        // Only process assistant message content if we haven't already via stream_event
        // This prevents duplicate content when includePartialMessages=true
        if (!hasProcessedViaStream) {
          if (!hasStartedMessage) {
            yield messageStart(agentId, sdkMsg.message.id, sdkMsg.message.model);
            hasStartedMessage = true;
          }
          yield* processAssistantContent(agentId, sdkMsg);
          yield messageStop(agentId);
        }
        // Reset for next turn
        hasStartedMessage = false;
        hasProcessedViaStream = false;
        break;

      case "stream_event":
        yield* processStreamEvent(agentId, sdkMsg);
        if (sdkMsg.event.type === "message_start") {
          hasStartedMessage = true;
          hasProcessedViaStream = true;  // Mark that we're processing via stream
        }
        if (sdkMsg.event.type === "message_stop") {
          hasStartedMessage = false;
        }
        break;

      case "result":
        if (sdkMsg.subtype !== "success") {
          throw new Error(`Claude SDK error: ${sdkMsg.subtype}`);
        }
        break;

      case "user":
        if (sdkMsg.message && Array.isArray(sdkMsg.message.content)) {
          for (const block of sdkMsg.message.content) {
            if (block.type === "tool_result") {
              yield toolResult(agentId, block.tool_use_id, block.content, block.is_error || false);
            }
          }
        }
        break;
    }
  }
}

// ============================================================================
// Driver State Management
// ============================================================================

function getOrCreateState(agentId: string): DriverState {
  if (!driverStates.has(agentId)) {
    driverStates.set(agentId, {
      promptSubject: new Subject<SDKUserMessage>(),
      responseSubject: new Subject<SDKMessage>(),
      claudeQuery: null,
      abortController: new AbortController(),
      sessionMap: new Map(),
      isInitialized: false,
    });
  }
  return driverStates.get(agentId)!;
}

async function initializeState(
  state: DriverState,
  agentId: string,
  config: ClaudeSDKDriverConfig
): Promise<void> {
  if (state.isInitialized) return;

  logger.info("Initializing ClaudeSDKDriver", { agentId });

  const options = buildOptions(config, state.abortController);
  const promptStream = observableToAsyncIterable(state.promptSubject);

  state.claudeQuery = query({
    prompt: promptStream,
    options,
  });

  state.isInitialized = true;

  // Background listener
  (async () => {
    try {
      for await (const sdkMsg of state.claudeQuery!) {
        state.responseSubject.next(sdkMsg);
      }
      state.responseSubject.complete();
    } catch (error) {
      logger.error("Background listener error", { error });
      state.responseSubject.error(error);
    }
  })();

  logger.info("ClaudeSDKDriver initialized", { agentId });
}

// ============================================================================
// ClaudeSDKDriver
// ============================================================================

export const ClaudeSDKDriver: AgentDriver<ClaudeSDKDriverConfig> = {
  name: "ClaudeSDK",
  description: "Claude AI SDK integration using Streaming Input Mode",

  async *receive(
    message: UserMessage,
    context: AgentContext<ClaudeSDKDriverConfig>
  ): AsyncIterable<StreamEventType> {
    const { agentId, ...config } = context;
    const state = getOrCreateState(agentId);

    await initializeState(state, agentId, config);

    const sessionId = agentId;
    const sdkUserMessage = buildSDKUserMessage(message, sessionId);

    logger.debug("Sending message", { agentId, content: buildPrompt(message).substring(0, 80) });
    state.promptSubject.next(sdkUserMessage);

    const responseStream = (async function* () {
      for await (const sdkMsg of observableToAsyncIterable(state.responseSubject)) {
        yield sdkMsg;
        if (sdkMsg.type === "result") break;
      }
    })();

    yield* transformSDKMessages(agentId, responseStream, (capturedSessionId) => {
      state.sessionMap.set(agentId, capturedSessionId);
    });
  },
};

/**
 * Cleanup driver state for an agent
 */
export function destroyClaudeDriver(agentId: string): void {
  const state = driverStates.get(agentId);
  if (state) {
    state.promptSubject.complete();
    state.responseSubject.complete();
    state.abortController.abort();
    driverStates.delete(agentId);
    logger.info("ClaudeSDKDriver destroyed", { agentId });
  }
}
