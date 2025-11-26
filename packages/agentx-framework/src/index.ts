/**
 * @deepractice-ai/agentx-framework
 *
 * Unified API surface for the AgentX ecosystem.
 * Users only need to depend on this package.
 *
 * @packageDocumentation
 */

// ==================== Core API ====================
// Re-export from @deepractice-ai/agentx-core

/**
 * High-level agent creation (from DefinedAgent)
 *
 * @example
 * ```typescript
 * import { createAgent } from "@deepractice-ai/agentx-framework";
 * import { ClaudeAgent } from "@deepractice-ai/agentx-sdk-claude";
 *
 * const agent = createAgent(ClaudeAgent, {
 *   apiKey: "xxx",
 *   model: "claude-sonnet-4-5-20250929",
 * });
 * ```
 */
export { createAgent } from "./createAgent";

/**
 * AgentInstance - User-facing API
 *
 * Methods: initialize(), send(), react(), clear(), destroy()
 * Properties: id, sessionId, messages
 */
export { AgentInstance } from "@deepractice-ai/agentx-core";

// ==================== Messages (User Data) ====================
// Re-export from @deepractice-ai/agentx-types

export type {
  // Agent state
  AgentState,

  // Message types (user needs to work with these)
  Message,
  UserMessage,
  AssistantMessage,
  SystemMessage,
  ToolUseMessage,
  ErrorMessage,

  // Content parts (for multimodal messages)
  ContentPart,
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,

  // Message metadata
  MessageRole,
  ErrorSubtype,
  ErrorSeverity,
} from "@deepractice-ai/agentx-types";

// Type guards (user may need these)
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
// Re-export from @deepractice-ai/agentx-event

// Base event types (from agentx-event)
export type { AgentEvent, AgentEventType } from "@deepractice-ai/agentx-event";

// Event bus interfaces (from agentx-engine)
export type {
  EventBus,
  EventProducer,
  EventConsumer,
  Unsubscribe,
} from "@deepractice-ai/agentx-engine";

// Stream layer events (real-time streaming)
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
  ToolResultEvent,
} from "@deepractice-ai/agentx-event";

// State layer events (lifecycle & state transitions)
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
  ErrorOccurredStateEvent,
} from "@deepractice-ai/agentx-event";

// Message layer events (complete messages)
export type {
  MessageEventType,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "@deepractice-ai/agentx-event";

// Turn layer events (analytics & cost tracking)
export type {
  TurnEventType,
  TurnRequestEvent,
  TurnResponseEvent,
} from "@deepractice-ai/agentx-event";

// ==================== Reactors (Event Handlers) ====================

// Core reactor types (from @deepractice-ai/agentx-core)
export type { AgentReactor, AgentReactorContext } from "@deepractice-ai/agentx-engine";

// 4-layer user-facing reactor interfaces (framework-provided)
export type {
  StreamReactor,
  StateReactor,
  MessageReactor,
  TurnReactor,
} from "@deepractice-ai/agentx-engine";

// Reactor adapters (for advanced framework usage)
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  TurnReactorAdapter,
  createReactorAdapter,
  type ReactorAdapter,
} from "@deepractice-ai/agentx-engine";

// ==================== Platform Abstraction ====================
// Re-export from @deepractice-ai/agentx-core

/**
 * AgentDriver interface - for implementing custom drivers
 *
 * Most users don't need this - use platform-specific drivers:
 * - ClaudeDriver from @deepractice-ai/agentx-node
 * - BrowserDriver from @deepractice-ai/agentx-browser
 */
export type { AgentDriver } from "@deepractice-ai/agentx-engine";

// ==================== Framework Define API ====================
// Simplified APIs for building custom drivers, reactors, and agents

/**
 * defineDriver - Simplified driver creation
 *
 * @example
 * ```typescript
 * const MyDriver = defineDriver({
 *   name: "MyDriver",
 *   generate: async function* (message) {
 *     yield "Hello: " + message;
 *   }
 * });
 * ```
 */
export { defineDriver } from "./defineDriver";
export type { DriverDefinition, DefinedDriver } from "./defineDriver";

/**
 * defineReactor - Simplified reactor creation
 *
 * @example
 * ```typescript
 * const Logger = defineReactor({
 *   name: "Logger",
 *   onTextDelta: (event) => console.log(event.data.text)
 * });
 * ```
 */
export { defineReactor } from "./defineReactor";
export type { ReactorDefinition, DefinedReactor } from "./defineReactor";

/**
 * defineConfig - Schema-based configuration
 *
 * @example
 * ```typescript
 * const MyConfig = defineConfig({
 *   apiKey: { type: "string", required: true },
 *   model: { type: "string", default: "claude-3-5-sonnet" }
 * });
 * ```
 */
export { defineConfig, ConfigValidationError } from "./defineConfig";
export type {
  DefinedConfig,
  ConfigSchema,
  FieldDefinition,
  FieldType,
  InferConfig,
} from "./defineConfig";

/**
 * defineAgent - Compose driver, reactors, and config
 *
 * @example
 * ```typescript
 * const MyAgent = defineAgent({
 *   name: "MyAgent",
 *   driver: defineDriver({ ... }),
 *   reactors: [defineReactor({ ... })],
 *   config: defineConfig({ ... })
 * });
 *
 * const agent = MyAgent.create({ apiKey: "xxx" });
 * ```
 */
export { defineAgent } from "./defineAgent";
export type { AgentDefinition, DefinedAgent } from "./defineAgent";

// ==================== Global Configuration ====================
// Framework-level configuration

/**
 * configure - Configure AgentX framework globally
 *
 * This should be called once in your application entry point, before creating
 * any agents. It configures logger implementation, error handlers, and other
 * framework-level settings.
 *
 * @example Development configuration
 * ```typescript
 * import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
 *
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.DEBUG,
 *     consoleOptions: { colors: true, timestamps: true }
 *   }
 * });
 * ```
 *
 * @example Production with custom logger
 * ```typescript
 * import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
 * import pino from "pino";
 *
 * configure({
 *   logger: {
 *     defaultLevel: LogLevel.INFO,
 *     defaultImplementation: (name) => new PinoLoggerAdapter(name)
 *   }
 * });
 * ```
 */
export { configure, type AgentXConfig } from "./configure";

/**
 * Logger types and utilities
 *
 * Re-exported from @deepractice-ai/agentx-logger for convenience.
 * Users can configure custom logger implementations via configure().
 */
export {
  LogLevel,
  LoggerFactory,
  type LoggerProvider,
  type LogContext,
  type LoggerFactoryConfig,
} from "@deepractice-ai/agentx-logger";

// ==================== Errors ====================
// Framework-specific errors

export { AgentConfigError, AgentAbortError } from "./errors";

// ==================== Drivers ====================
// Note: Specific SDK integrations are in separate packages:
// - @deepractice-ai/agentx-sdk-claude
// - @deepractice-ai/agentx-sdk-gemini

// ==================== Reactor Implementations ====================
// Built-in reactor implementations
// Note: All WebSocket-related code moved to application layer (agentx-web)

// ==================== Pre-configured Agents ====================
// Note: Specific SDK integrations are in separate packages:
// - @deepractice-ai/agentx-sdk-claude
// - @deepractice-ai/agentx-sdk-gemini

// ==================== MCP (Model Context Protocol) ====================
// Re-export from @deepractice-ai/agentx-types (for users working with MCP servers)

export type {
  // MCP Tools
  McpTool,
  McpToolResult,
  JsonSchema,

  // MCP Resources
  McpResource,
  McpResourceContents,

  // MCP Prompts
  McpPrompt,
  McpPromptMessage,

  // MCP Server
  McpServerInfo,
  McpServerCapabilities,

  // MCP Transport (from agentx-types, different from config/McpTransportConfig)
  McpStdioTransport,
  McpSseTransport,
  McpHttpTransport,
} from "@deepractice-ai/agentx-types";

export { LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from "@deepractice-ai/agentx-types";
