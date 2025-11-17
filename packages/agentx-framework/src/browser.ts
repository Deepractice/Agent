/**
 * @deepractice-ai/agentx-framework/browser
 *
 * Browser-only exports - excludes Node.js dependencies like Claude SDK
 *
 * @packageDocumentation
 */

// ==================== Core API ====================
export { createAgent } from "@deepractice-ai/agentx-core";
export { AgentService } from "@deepractice-ai/agentx-core";

// ==================== Messages (User Data) ====================
export type {
  Message,
  UserMessage,
  AssistantMessage,
  SystemMessage,
  ToolUseMessage,
  ErrorMessage,
  ContentPart,
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  MessageRole,
  ErrorSubtype,
  ErrorSeverity,
} from "@deepractice-ai/agentx-types";

export {
  isUserMessage,
  isAssistantMessage,
  isSystemMessage,
  isToolUseMessage,
  isErrorMessage,
  isTextPart,
  isThinkingPart,
  isImagePart,
  isFilePart,
  isToolCallPart,
  isToolResultPart,
} from "@deepractice-ai/agentx-types";

// ==================== Events (Observable Data) ====================
export type {
  AgentEvent,
  AgentEventType,
  EventBus,
  EventProducer,
  EventConsumer,
  Unsubscribe,
} from "@deepractice-ai/agentx-event";

// Stream layer events
export type {
  StreamEventType,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "@deepractice-ai/agentx-event";

// State layer events
export type {
  StateEventType,
  AgentReadyStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolFailedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
  ErrorOccurredStateEvent,
} from "@deepractice-ai/agentx-event";

// Message layer events
export type {
  MessageEventType,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "@deepractice-ai/agentx-event";

// Exchange layer events
export type {
  ExchangeEventType,
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "@deepractice-ai/agentx-event";

// ==================== Reactors ====================
export type {
  Reactor,
  ReactorContext,
} from "@deepractice-ai/agentx-core";

export type {
  StreamReactor,
  StateReactor,
  MessageReactor,
  ExchangeReactor,
} from "./interfaces";

// ==================== Platform Abstraction ====================
export type { AgentDriver } from "@deepractice-ai/agentx-core";
export type { AgentLogger, LogContext } from "@deepractice-ai/agentx-core";
export { LogLevel, LogFormatter } from "@deepractice-ai/agentx-core";
export type { EngineConfig } from "@deepractice-ai/agentx-core";

// ==================== Framework Define API ====================
export { defineDriver } from "./defineDriver";
export type { DriverDefinition, DefinedDriver } from "./defineDriver";

export { defineReactor } from "./defineReactor";
export type { ReactorDefinition, DefinedReactor } from "./defineReactor";

export { defineConfig, ConfigValidationError } from "./defineConfig";
export type {
  DefinedConfig,
  ConfigSchema,
  FieldDefinition,
  FieldType,
  InferConfig,
} from "./defineConfig";

export { defineAgent } from "./defineAgent";
export type { AgentDefinition, DefinedAgent } from "./defineAgent";

// ==================== Errors ====================
export { AgentConfigError, AgentAbortError } from "./errors";

// ==================== Browser-Only Drivers ====================
/**
 * WebSocketDriver - Client-side WebSocket driver for browser
 * Converts WebSocket messages → Agent events
 */
export { WebSocketDriver, type WebSocketDriverConfig } from "./drivers/WebSocketDriver";

// ==================== Browser-Only Agents ====================
/**
 * WebSocketBrowserAgent - Browser WebSocket client agent
 * Connects to WebSocketServer and receives streaming events
 * @example
 * ```typescript
 * import { WebSocketBrowserAgent } from "@deepractice-ai/agentx-framework/browser";
 * const agent = WebSocketBrowserAgent.create({
 *   url: "ws://localhost:5200/ws",
 *   sessionId: "my-session"
 * });
 * ```
 */
export { WebSocketBrowserAgent } from "./agents/WebSocketBrowserAgent";

// ==================== MCP Types (for type definitions only) ====================
export type {
  McpTool,
  McpToolResult,
  JsonSchema,
  McpResource,
  McpResourceContents,
  McpPrompt,
  McpPromptMessage,
  McpServerInfo,
  McpServerCapabilities,
  McpStdioTransport,
  McpSseTransport,
  McpHttpTransport,
} from "@deepractice-ai/agentx-types";

export {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@deepractice-ai/agentx-types";
