/**
 * agentxjs - Browser Entry Point
 *
 * This entry is automatically selected by bundlers (Vite, Webpack, etc.)
 * when building for browser environments.
 *
 * Only includes remote mode (WebSocket client).
 * Does not include Node.js specific code (runtime, fs, sqlite, etc.)
 */

// Re-export everything from index except createAgentX
export type {
  AgentX,
  AgentXConfig,
  LocalConfig,
  RemoteConfig,
  LLMConfig,
  StorageConfig,
  StorageDriver,
  Unsubscribe,
} from "@agentxjs/types/agentx";

export { isLocalConfig, isRemoteConfig } from "@agentxjs/types/agentx";

// Event types
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

// Command events
export type {
  CommandEvent,
  CommandRequest,
  CommandResponse,
  CommandEventType,
  CommandRequestType,
  CommandEventMap,
  ContainerCreateRequest,
  ContainerCreateResponse,
  ContainerGetRequest,
  ContainerGetResponse,
  ContainerListRequest,
  ContainerListResponse,
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

// Agent events
export type {
  AgentEvent,
  AgentEventCategory,
  AgentStreamEvent,
  AgentTextDeltaEvent,
  AgentMessageStartEvent,
  AgentMessageStopEvent,
  AgentToolUseStartEvent,
  AgentToolUseStopEvent,
  AgentToolResultEvent,
  AgentStateEvent,
  ConversationStartEvent,
  ConversationEndEvent,
  ConversationThinkingEvent,
  ConversationRespondingEvent,
  ToolExecutingEvent,
  ToolCompletedEvent,
  ErrorOccurredEvent,
  AgentMessageEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolCallMessageEvent,
  ToolResultMessageEvent,
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

// Data types
export type { ImageRecord } from "@agentxjs/types";

export type {
  Message,
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  AgentError,
  ContentPart,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ToolResultOutput,
} from "@agentxjs/types/agent";

// Browser-only createAgentX (remote mode only)
import type { AgentX, AgentXConfig } from "@agentxjs/types/agentx";
import { isRemoteConfig } from "@agentxjs/types/agentx";
import { createRemoteAgentX } from "./createAgentX";

/**
 * Create AgentX instance (Browser version - remote mode only)
 *
 * @param config - Must be RemoteConfig with server URL
 * @returns AgentX instance
 *
 * @example
 * ```typescript
 * const agentx = await createAgentX({ server: "ws://localhost:5200" });
 * ```
 */
export async function createAgentX(config: AgentXConfig): Promise<AgentX> {
  if (!config || !isRemoteConfig(config)) {
    throw new Error(
      "Browser environment only supports remote mode. " +
      "Please provide { serverUrl: \"ws://...\" } configuration."
    );
  }
  return createRemoteAgentX(config.serverUrl);
}

// Also export createRemoteAgentX for explicit usage
export { createRemoteAgentX } from "./createAgentX";
