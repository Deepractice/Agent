/**
 * CommandEvent - Request/Response events for Runtime operations
 *
 * These events enable unified operation API for both local and remote modes:
 * - Local mode: RuntimeImpl listens to requests, emits responses
 * - Remote mode: WebSocket/SSE forwards requests/responses
 *
 * Pattern:
 * ```
 * Caller                              Handler (Runtime)
 * ─────────────────────────────────────────────────────────
 * container_create_request  ────────►  handle & execute
 *                          ◄────────  container_create_response
 *
 * agent_run_request        ────────►  handle & execute
 *                          ◄────────  agent_run_response
 * ```
 *
 * All CommandEvents have:
 * - source: "command"
 * - category: "request" | "response"
 * - intent: "request" | "result"
 */

import type { SystemEvent } from "../base";
import type { ImageRecord } from "~/runtime/internal/persistence";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base interface for Command request events
 */
interface BaseCommandRequest<T extends string, D = unknown>
  extends SystemEvent<T, D, "command", "request", "request"> {}

/**
 * Base interface for Command response events
 */
interface BaseCommandResponse<T extends string, D = unknown>
  extends SystemEvent<T, D, "command", "response", "result"> {}

// ============================================================================
// Container Commands
// ============================================================================

/**
 * Request to create a container
 */
export interface ContainerCreateRequest
  extends BaseCommandRequest<
    "container_create_request",
    {
      requestId: string;
      containerId: string;
    }
  > {}

/**
 * Response to container creation
 */
export interface ContainerCreateResponse
  extends BaseCommandResponse<
    "container_create_response",
    {
      requestId: string;
      containerId: string;
      error?: string;
    }
  > {}

/**
 * Request to get a container
 */
export interface ContainerGetRequest
  extends BaseCommandRequest<
    "container_get_request",
    {
      requestId: string;
      containerId: string;
    }
  > {}

/**
 * Response to container get
 */
export interface ContainerGetResponse
  extends BaseCommandResponse<
    "container_get_response",
    {
      requestId: string;
      containerId?: string;
      exists: boolean;
      error?: string;
    }
  > {}

/**
 * Request to list containers
 */
export interface ContainerListRequest
  extends BaseCommandRequest<
    "container_list_request",
    {
      requestId: string;
    }
  > {}

/**
 * Response to container list
 */
export interface ContainerListResponse
  extends BaseCommandResponse<
    "container_list_response",
    {
      requestId: string;
      containerIds: string[];
      error?: string;
    }
  > {}

// ============================================================================
// Agent Commands
// ============================================================================

/**
 * Request to get an agent
 */
export interface AgentGetRequest
  extends BaseCommandRequest<
    "agent_get_request",
    {
      requestId: string;
      agentId: string;
    }
  > {}

/**
 * Response to agent get
 */
export interface AgentGetResponse
  extends BaseCommandResponse<
    "agent_get_response",
    {
      requestId: string;
      agentId?: string;
      containerId?: string;
      exists: boolean;
      error?: string;
    }
  > {}

/**
 * Request to list agents
 */
export interface AgentListRequest
  extends BaseCommandRequest<
    "agent_list_request",
    {
      requestId: string;
      containerId: string;
    }
  > {}

/**
 * Response to agent list
 */
export interface AgentListResponse
  extends BaseCommandResponse<
    "agent_list_response",
    {
      requestId: string;
      agents: Array<{ agentId: string; containerId: string; imageId: string }>;
      error?: string;
    }
  > {}

/**
 * Request to destroy an agent
 */
export interface AgentDestroyRequest
  extends BaseCommandRequest<
    "agent_destroy_request",
    {
      requestId: string;
      agentId: string;
    }
  > {}

/**
 * Response to agent destroy
 */
export interface AgentDestroyResponse
  extends BaseCommandResponse<
    "agent_destroy_response",
    {
      requestId: string;
      agentId: string;
      success: boolean;
      error?: string;
    }
  > {}

/**
 * Request to destroy all agents in a container
 */
export interface AgentDestroyAllRequest
  extends BaseCommandRequest<
    "agent_destroy_all_request",
    {
      requestId: string;
      containerId: string;
    }
  > {}

/**
 * Response to destroy all agents
 */
export interface AgentDestroyAllResponse
  extends BaseCommandResponse<
    "agent_destroy_all_response",
    {
      requestId: string;
      containerId: string;
      error?: string;
    }
  > {}

/**
 * Request to send a message
 * Can use either imageId (preferred) or agentId
 * If using imageId and agent is not running, it will be auto-activated
 */
export interface MessageSendRequest
  extends BaseCommandRequest<
    "message_send_request",
    {
      requestId: string;
      /** Image ID (preferred) - will auto-activate if offline */
      imageId?: string;
      /** Agent ID (legacy) - must be already running */
      agentId?: string;
      content: string;
    }
  > {}

/**
 * Response to message send (acknowledges message received, not completion)
 */
export interface MessageSendResponse
  extends BaseCommandResponse<
    "message_send_response",
    {
      requestId: string;
      imageId?: string;
      agentId: string;
      error?: string;
    }
  > {}

/**
 * Request to interrupt an agent
 * Can use either imageId or agentId
 */
export interface AgentInterruptRequest
  extends BaseCommandRequest<
    "agent_interrupt_request",
    {
      requestId: string;
      /** Image ID (preferred) */
      imageId?: string;
      /** Agent ID (legacy) */
      agentId?: string;
    }
  > {}

/**
 * Response to agent interrupt
 */
export interface AgentInterruptResponse
  extends BaseCommandResponse<
    "agent_interrupt_response",
    {
      requestId: string;
      imageId?: string;
      agentId?: string;
      error?: string;
    }
  > {}

// ============================================================================
// Image Commands
// ============================================================================

/**
 * Request to create a new image (conversation)
 */
export interface ImageCreateRequest
  extends BaseCommandRequest<
    "image_create_request",
    {
      requestId: string;
      containerId: string;
      config: {
        name?: string;
        description?: string;
        systemPrompt?: string;
      };
    }
  > {}

/**
 * Response to image creation
 */
export interface ImageCreateResponse
  extends BaseCommandResponse<
    "image_create_response",
    {
      requestId: string;
      record: ImageRecord;
      error?: string;
    }
  > {}

/**
 * Request to run an image (create or reuse agent)
 */
export interface ImageRunRequest
  extends BaseCommandRequest<
    "image_run_request",
    {
      requestId: string;
      imageId: string;
    }
  > {}

/**
 * Response to image run
 */
export interface ImageRunResponse
  extends BaseCommandResponse<
    "image_run_response",
    {
      requestId: string;
      imageId: string;
      agentId: string;
      /** true if reusing existing agent, false if newly created */
      reused: boolean;
      error?: string;
    }
  > {}

/**
 * Request to stop an image (destroy agent, keep image)
 */
export interface ImageStopRequest
  extends BaseCommandRequest<
    "image_stop_request",
    {
      requestId: string;
      imageId: string;
    }
  > {}

/**
 * Response to image stop
 */
export interface ImageStopResponse
  extends BaseCommandResponse<
    "image_stop_response",
    {
      requestId: string;
      imageId: string;
      error?: string;
    }
  > {}

/**
 * Request to update an image (name, description, etc.)
 */
export interface ImageUpdateRequest
  extends BaseCommandRequest<
    "image_update_request",
    {
      requestId: string;
      imageId: string;
      updates: {
        name?: string;
        description?: string;
      };
    }
  > {}

/**
 * Response to image update
 */
export interface ImageUpdateResponse
  extends BaseCommandResponse<
    "image_update_response",
    {
      requestId: string;
      record: ImageRecord;
      error?: string;
    }
  > {}

/**
 * Request to list all images
 */
export interface ImageListRequest
  extends BaseCommandRequest<
    "image_list_request",
    {
      requestId: string;
      containerId?: string;
    }
  > {}

/**
 * Image list item with online status
 */
export interface ImageListItem extends ImageRecord {
  /** Whether an agent is currently running for this image */
  online: boolean;
  /** Current agent ID if online */
  agentId?: string;
}

/**
 * Response to image list
 */
export interface ImageListResponse
  extends BaseCommandResponse<
    "image_list_response",
    {
      requestId: string;
      records: ImageListItem[];
      error?: string;
    }
  > {}

/**
 * Request to get an image by ID
 */
export interface ImageGetRequest
  extends BaseCommandRequest<
    "image_get_request",
    {
      requestId: string;
      imageId: string;
    }
  > {}

/**
 * Response to image get
 */
export interface ImageGetResponse
  extends BaseCommandResponse<
    "image_get_response",
    {
      requestId: string;
      record?: ImageListItem | null;
      error?: string;
    }
  > {}

/**
 * Request to delete an image
 */
export interface ImageDeleteRequest
  extends BaseCommandRequest<
    "image_delete_request",
    {
      requestId: string;
      imageId: string;
    }
  > {}

/**
 * Response to image delete
 */
export interface ImageDeleteResponse
  extends BaseCommandResponse<
    "image_delete_response",
    {
      requestId: string;
      imageId: string;
      error?: string;
    }
  > {}

/**
 * Request to get messages for an image
 */
export interface ImageMessagesRequest
  extends BaseCommandRequest<
    "image_messages_request",
    {
      requestId: string;
      imageId: string;
    }
  > {}

/**
 * Response to image messages request
 */
export interface ImageMessagesResponse
  extends BaseCommandResponse<
    "image_messages_response",
    {
      requestId: string;
      imageId: string;
      messages: Array<{
        id: string;
        role: "user" | "assistant" | "tool_call" | "tool_result";
        content: unknown;
        timestamp: number;
      }>;
      error?: string;
    }
  > {}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All Command request events
 */
export type CommandRequest =
  // Container
  | ContainerCreateRequest
  | ContainerGetRequest
  | ContainerListRequest
  // Agent
  | AgentGetRequest
  | AgentListRequest
  | AgentDestroyRequest
  | AgentDestroyAllRequest
  | MessageSendRequest
  | AgentInterruptRequest
  // Image
  | ImageCreateRequest
  | ImageRunRequest
  | ImageStopRequest
  | ImageUpdateRequest
  | ImageListRequest
  | ImageGetRequest
  | ImageDeleteRequest
  | ImageMessagesRequest;

/**
 * All Command response events
 */
export type CommandResponse =
  // Container
  | ContainerCreateResponse
  | ContainerGetResponse
  | ContainerListResponse
  // Agent
  | AgentGetResponse
  | AgentListResponse
  | AgentDestroyResponse
  | AgentDestroyAllResponse
  | MessageSendResponse
  | AgentInterruptResponse
  // Image
  | ImageCreateResponse
  | ImageRunResponse
  | ImageStopResponse
  | ImageUpdateResponse
  | ImageListResponse
  | ImageGetResponse
  | ImageDeleteResponse
  | ImageMessagesResponse;

/**
 * All Command events (requests + responses)
 */
export type CommandEvent = CommandRequest | CommandResponse;

/**
 * Command event type strings
 */
export type CommandEventType = CommandEvent["type"];

/**
 * Type guard: is this a CommandEvent?
 */
export function isCommandEvent(event: { source?: string }): event is CommandEvent {
  return event.source === "command";
}

/**
 * Type guard: is this a Command request event?
 */
export function isCommandRequest(event: {
  source?: string;
  category?: string;
}): event is CommandRequest {
  return event.source === "command" && event.category === "request";
}

/**
 * Type guard: is this a Command response event?
 */
export function isCommandResponse(event: {
  source?: string;
  category?: string;
}): event is CommandResponse {
  return event.source === "command" && event.category === "response";
}

// ============================================================================
// Event Map - Type-safe event type to event mapping
// ============================================================================

/**
 * CommandEventMap - Maps event type string to event interface
 *
 * Enables type-safe event handling:
 * ```typescript
 * bus.onCommand("container_create_request", (event) => {
 *   event.data.requestId;    // ✓ string
 *   event.data.containerId;  // ✓ string
 * });
 * ```
 */
export interface CommandEventMap {
  // Container
  container_create_request: ContainerCreateRequest;
  container_create_response: ContainerCreateResponse;
  container_get_request: ContainerGetRequest;
  container_get_response: ContainerGetResponse;
  container_list_request: ContainerListRequest;
  container_list_response: ContainerListResponse;
  // Agent
  agent_get_request: AgentGetRequest;
  agent_get_response: AgentGetResponse;
  agent_list_request: AgentListRequest;
  agent_list_response: AgentListResponse;
  agent_destroy_request: AgentDestroyRequest;
  agent_destroy_response: AgentDestroyResponse;
  agent_destroy_all_request: AgentDestroyAllRequest;
  agent_destroy_all_response: AgentDestroyAllResponse;
  message_send_request: MessageSendRequest;
  message_send_response: MessageSendResponse;
  agent_interrupt_request: AgentInterruptRequest;
  agent_interrupt_response: AgentInterruptResponse;
  // Image
  image_create_request: ImageCreateRequest;
  image_create_response: ImageCreateResponse;
  image_run_request: ImageRunRequest;
  image_run_response: ImageRunResponse;
  image_stop_request: ImageStopRequest;
  image_stop_response: ImageStopResponse;
  image_update_request: ImageUpdateRequest;
  image_update_response: ImageUpdateResponse;
  image_list_request: ImageListRequest;
  image_list_response: ImageListResponse;
  image_get_request: ImageGetRequest;
  image_get_response: ImageGetResponse;
  image_delete_request: ImageDeleteRequest;
  image_delete_response: ImageDeleteResponse;
  image_messages_request: ImageMessagesRequest;
  image_messages_response: ImageMessagesResponse;
}

/**
 * Maps request event type to its corresponding response event type
 */
export interface CommandRequestResponseMap {
  container_create_request: "container_create_response";
  container_get_request: "container_get_response";
  container_list_request: "container_list_response";
  agent_get_request: "agent_get_response";
  agent_list_request: "agent_list_response";
  agent_destroy_request: "agent_destroy_response";
  agent_destroy_all_request: "agent_destroy_all_response";
  message_send_request: "message_send_response";
  agent_interrupt_request: "agent_interrupt_response";
  image_create_request: "image_create_response";
  image_run_request: "image_run_response";
  image_stop_request: "image_stop_response";
  image_update_request: "image_update_response";
  image_list_request: "image_list_response";
  image_get_request: "image_get_response";
  image_delete_request: "image_delete_response";
  image_messages_request: "image_messages_response";
}

/**
 * All command request types
 */
export type CommandRequestType = keyof CommandRequestResponseMap;

/**
 * Get response type for a request type
 */
export type ResponseTypeFor<T extends CommandRequestType> = CommandRequestResponseMap[T];

/**
 * Get response event for a request type
 */
export type ResponseEventFor<T extends CommandRequestType> = CommandEventMap[ResponseTypeFor<T>];

/**
 * Get request data type (without requestId, as it's auto-generated)
 */
export type RequestDataFor<T extends CommandRequestType> = Omit<
  CommandEventMap[T]["data"],
  "requestId"
>;
