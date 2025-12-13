/**
 * agentxjs - Unified API for AI Agents
 *
 * All public types and functions are exported from this single entry point.
 * Users only need: `import { ... } from "agentxjs"`
 *
 * @example
 * ```typescript
 * import { createAgentX, type AgentX, type SystemEvent } from "agentxjs";
 *
 * // Local mode
 * const agentx = await createAgentX();
 *
 * // Remote mode
 * const agentx = await createAgentX({ server: "ws://localhost:5200" });
 *
 * // Same API for both modes!
 * const res = await agentx.request("container_create_request", {
 *   containerId: "my-container"
 * });
 *
 * agentx.on("text_delta", (e) => console.log(e.data.text));
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Factory
// ============================================================================

export { createAgentX, createRemoteAgentX } from "./createAgentX";

// ============================================================================
// Core Types - AgentX API
// ============================================================================

export type {
  AgentX,
  AgentXConfig,
  LocalConfig,
  RemoteConfig,
  LLMConfig,
  StorageConfig,
  StorageDriver,
  Unsubscribe,
  AgentDefinition,
} from "@agentxjs/types/agentx";

export { isLocalConfig, isRemoteConfig } from "@agentxjs/types/agentx";

// ============================================================================
// defineAgent - Implementation
// ============================================================================

import type { AgentDefinition } from "@agentxjs/types/agentx";

/**
 * Define an Agent with type safety
 *
 * Helper function that provides type inference for AgentDefinition.
 *
 * @example
 * ```typescript
 * import { defineAgent } from "agentxjs";
 *
 * export const MyAgent = defineAgent({
 *   name: "MyAgent",
 *   systemPrompt: "You are helpful.",
 *   mcpServers: {
 *     filesystem: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] }
 *   }
 * });
 * ```
 */
export function defineAgent<T extends AgentDefinition>(definition: T): T {
  return definition;
}

// ============================================================================
// Event Types - SystemEvent and all event categories
// ============================================================================

// Base event
export type {
  SystemEvent,
  EventSource,
  EventCategory,
  EventIntent,
  EventContext,
} from "@agentxjs/types/event";

export {
  isFromSource,
  hasIntent,
  isRequest,
  isResult,
  isNotification,
} from "@agentxjs/types/event";

// Command events (request/response)
export type {
  CommandEvent,
  CommandRequest,
  CommandResponse,
  CommandEventType,
  CommandRequestType,
  CommandEventMap,
  // Container commands
  ContainerCreateRequest,
  ContainerCreateResponse,
  ContainerGetRequest,
  ContainerGetResponse,
  ContainerListRequest,
  ContainerListResponse,
  // Agent commands
  AgentGetRequest,
  AgentGetResponse,
  AgentListRequest,
  AgentListResponse,
  AgentDestroyRequest,
  AgentDestroyResponse,
  MessageSendRequest,
  MessageSendResponse,
  AgentInterruptRequest,
  AgentInterruptResponse,
  // Image commands
  ImageCreateRequest,
  ImageCreateResponse,
  ImageRunRequest,
  ImageRunResponse,
  ImageStopRequest,
  ImageStopResponse,
  ImageUpdateRequest,
  ImageUpdateResponse,
  ImageListRequest,
  ImageListResponse,
  ImageListItem,
  ImageGetRequest,
  ImageGetResponse,
  ImageDeleteRequest,
  ImageDeleteResponse,
} from "@agentxjs/types/event";

export { isCommandEvent, isCommandRequest, isCommandResponse } from "@agentxjs/types/event";

// Agent events (stream/state/message/turn)
export type {
  AgentEvent,
  AgentEventCategory,
  // Stream events
  AgentStreamEvent,
  AgentTextDeltaEvent,
  AgentMessageStartEvent,
  AgentMessageStopEvent,
  AgentToolUseStartEvent,
  AgentToolUseStopEvent,
  AgentToolResultEvent,
  // State events
  AgentStateEvent,
  ConversationStartEvent,
  ConversationEndEvent,
  ConversationThinkingEvent,
  ConversationRespondingEvent,
  ToolExecutingEvent,
  ToolCompletedEvent,
  ErrorOccurredEvent,
  // Message events
  AgentMessageEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolCallMessageEvent,
  ToolResultMessageEvent,
  // Turn events
  AgentTurnEvent,
  TurnRequestEvent,
  TurnResponseEvent,
  TokenUsage,
} from "@agentxjs/types/event";

export {
  isAgentEvent,
  isAgentStreamEvent,
  isAgentStateEvent,
  isAgentMessageEvent,
  isAgentTurnEvent,
} from "@agentxjs/types/event";

// ============================================================================
// Data Types - Records and Messages
// ============================================================================

// Image record (for persistence)
export type { ImageRecord } from "@agentxjs/types";

// Message types (for UI components)
export type {
  Message,
  MessageRole,
  MessageSubtype,
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
  AgentError,
  AgentState,
  ContentPart,
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  ToolResultOutput,
} from "@agentxjs/types/agent";

// ============================================================================
// Logger - from @agentxjs/common
// ============================================================================

export { createLogger, ConsoleLogger, LoggerFactoryImpl, setLoggerFactory } from "@agentxjs/common";

export type {
  Logger,
  LoggerFactory,
  LogContext,
  LogLevel,
  ConsoleLoggerOptions,
  LoggerFactoryConfig,
} from "@agentxjs/common";
