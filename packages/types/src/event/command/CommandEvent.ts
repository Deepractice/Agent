/**
 * CommandEvent - Request/Response events for Runtime operations
 *
 * These events enable unified operation API for both local and remote modes:
 * - Source mode: RuntimeImpl listens to requests, emits responses
 * - Mirror mode: WebSocket forwards requests/responses
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
import type { ImageRecord } from "~/persistence";

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
export interface ContainerCreateRequest extends BaseCommandRequest<"container_create_request", {
  requestId: string;
  containerId: string;
}> {}

/**
 * Response to container creation
 */
export interface ContainerCreateResponse extends BaseCommandResponse<"container_create_response", {
  requestId: string;
  containerId: string;
  error?: string;
}> {}

/**
 * Request to get a container
 */
export interface ContainerGetRequest extends BaseCommandRequest<"container_get_request", {
  requestId: string;
  containerId: string;
}> {}

/**
 * Response to container get
 */
export interface ContainerGetResponse extends BaseCommandResponse<"container_get_response", {
  requestId: string;
  containerId?: string;
  exists: boolean;
  error?: string;
}> {}

/**
 * Request to list containers
 */
export interface ContainerListRequest extends BaseCommandRequest<"container_list_request", {
  requestId: string;
}> {}

/**
 * Response to container list
 */
export interface ContainerListResponse extends BaseCommandResponse<"container_list_response", {
  requestId: string;
  containerIds: string[];
  error?: string;
}> {}

// ============================================================================
// Agent Commands
// ============================================================================

/**
 * Request to run an agent
 */
export interface AgentRunRequest extends BaseCommandRequest<"agent_run_request", {
  requestId: string;
  containerId: string;
  config: {
    name: string;
    systemPrompt?: string;
  };
}> {}

/**
 * Response to agent run
 */
export interface AgentRunResponse extends BaseCommandResponse<"agent_run_response", {
  requestId: string;
  containerId: string;
  agentId?: string;
  error?: string;
}> {}

/**
 * Request to get an agent
 */
export interface AgentGetRequest extends BaseCommandRequest<"agent_get_request", {
  requestId: string;
  agentId: string;
}> {}

/**
 * Response to agent get
 */
export interface AgentGetResponse extends BaseCommandResponse<"agent_get_response", {
  requestId: string;
  agentId?: string;
  containerId?: string;
  exists: boolean;
  error?: string;
}> {}

/**
 * Request to list agents
 */
export interface AgentListRequest extends BaseCommandRequest<"agent_list_request", {
  requestId: string;
  containerId: string;
}> {}

/**
 * Response to agent list
 */
export interface AgentListResponse extends BaseCommandResponse<"agent_list_response", {
  requestId: string;
  agents: Array<{ agentId: string; containerId: string }>;
  error?: string;
}> {}

/**
 * Request to destroy an agent
 */
export interface AgentDestroyRequest extends BaseCommandRequest<"agent_destroy_request", {
  requestId: string;
  agentId: string;
}> {}

/**
 * Response to agent destroy
 */
export interface AgentDestroyResponse extends BaseCommandResponse<"agent_destroy_response", {
  requestId: string;
  agentId: string;
  success: boolean;
  error?: string;
}> {}

/**
 * Request to destroy all agents in a container
 */
export interface AgentDestroyAllRequest extends BaseCommandRequest<"agent_destroy_all_request", {
  requestId: string;
  containerId: string;
}> {}

/**
 * Response to destroy all agents
 */
export interface AgentDestroyAllResponse extends BaseCommandResponse<"agent_destroy_all_response", {
  requestId: string;
  containerId: string;
  error?: string;
}> {}

/**
 * Request to send a message to an agent
 */
export interface AgentReceiveRequest extends BaseCommandRequest<"agent_receive_request", {
  requestId: string;
  agentId: string;
  content: string;
}> {}

/**
 * Response to agent receive (acknowledges message received, not completion)
 */
export interface AgentReceiveResponse extends BaseCommandResponse<"agent_receive_response", {
  requestId: string;
  agentId: string;
  error?: string;
}> {}

/**
 * Request to interrupt an agent
 */
export interface AgentInterruptRequest extends BaseCommandRequest<"agent_interrupt_request", {
  requestId: string;
  agentId: string;
}> {}

/**
 * Response to agent interrupt
 */
export interface AgentInterruptResponse extends BaseCommandResponse<"agent_interrupt_response", {
  requestId: string;
  agentId: string;
  error?: string;
}> {}

// ============================================================================
// Image Commands
// ============================================================================

/**
 * Request to snapshot an agent
 */
export interface ImageSnapshotRequest extends BaseCommandRequest<"image_snapshot_request", {
  requestId: string;
  agentId: string;
}> {}

/**
 * Response to image snapshot
 */
export interface ImageSnapshotResponse extends BaseCommandResponse<"image_snapshot_response", {
  requestId: string;
  record?: ImageRecord;
  error?: string;
}> {}

/**
 * Request to list all images
 */
export interface ImageListRequest extends BaseCommandRequest<"image_list_request", {
  requestId: string;
}> {}

/**
 * Response to image list
 */
export interface ImageListResponse extends BaseCommandResponse<"image_list_response", {
  requestId: string;
  records: ImageRecord[];
  error?: string;
}> {}

/**
 * Request to get an image by ID
 */
export interface ImageGetRequest extends BaseCommandRequest<"image_get_request", {
  requestId: string;
  imageId: string;
}> {}

/**
 * Response to image get
 */
export interface ImageGetResponse extends BaseCommandResponse<"image_get_response", {
  requestId: string;
  record?: ImageRecord | null;
  error?: string;
}> {}

/**
 * Request to delete an image
 */
export interface ImageDeleteRequest extends BaseCommandRequest<"image_delete_request", {
  requestId: string;
  imageId: string;
}> {}

/**
 * Response to image delete
 */
export interface ImageDeleteResponse extends BaseCommandResponse<"image_delete_response", {
  requestId: string;
  imageId: string;
  error?: string;
}> {}

/**
 * Request to resume an image
 */
export interface ImageResumeRequest extends BaseCommandRequest<"image_resume_request", {
  requestId: string;
  imageId: string;
}> {}

/**
 * Response to image resume
 */
export interface ImageResumeResponse extends BaseCommandResponse<"image_resume_response", {
  requestId: string;
  imageId: string;
  containerId?: string;
  agentId?: string;
  error?: string;
}> {}

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
  | AgentRunRequest
  | AgentGetRequest
  | AgentListRequest
  | AgentDestroyRequest
  | AgentDestroyAllRequest
  | AgentReceiveRequest
  | AgentInterruptRequest
  // Image
  | ImageSnapshotRequest
  | ImageListRequest
  | ImageGetRequest
  | ImageDeleteRequest
  | ImageResumeRequest;

/**
 * All Command response events
 */
export type CommandResponse =
  // Container
  | ContainerCreateResponse
  | ContainerGetResponse
  | ContainerListResponse
  // Agent
  | AgentRunResponse
  | AgentGetResponse
  | AgentListResponse
  | AgentDestroyResponse
  | AgentDestroyAllResponse
  | AgentReceiveResponse
  | AgentInterruptResponse
  // Image
  | ImageSnapshotResponse
  | ImageListResponse
  | ImageGetResponse
  | ImageDeleteResponse
  | ImageResumeResponse;

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
export function isCommandRequest(event: { source?: string; category?: string }): event is CommandRequest {
  return event.source === "command" && event.category === "request";
}

/**
 * Type guard: is this a Command response event?
 */
export function isCommandResponse(event: { source?: string; category?: string }): event is CommandResponse {
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
  "container_create_request": ContainerCreateRequest;
  "container_create_response": ContainerCreateResponse;
  "container_get_request": ContainerGetRequest;
  "container_get_response": ContainerGetResponse;
  "container_list_request": ContainerListRequest;
  "container_list_response": ContainerListResponse;
  // Agent
  "agent_run_request": AgentRunRequest;
  "agent_run_response": AgentRunResponse;
  "agent_get_request": AgentGetRequest;
  "agent_get_response": AgentGetResponse;
  "agent_list_request": AgentListRequest;
  "agent_list_response": AgentListResponse;
  "agent_destroy_request": AgentDestroyRequest;
  "agent_destroy_response": AgentDestroyResponse;
  "agent_destroy_all_request": AgentDestroyAllRequest;
  "agent_destroy_all_response": AgentDestroyAllResponse;
  "agent_receive_request": AgentReceiveRequest;
  "agent_receive_response": AgentReceiveResponse;
  "agent_interrupt_request": AgentInterruptRequest;
  "agent_interrupt_response": AgentInterruptResponse;
  // Image
  "image_snapshot_request": ImageSnapshotRequest;
  "image_snapshot_response": ImageSnapshotResponse;
  "image_list_request": ImageListRequest;
  "image_list_response": ImageListResponse;
  "image_get_request": ImageGetRequest;
  "image_get_response": ImageGetResponse;
  "image_delete_request": ImageDeleteRequest;
  "image_delete_response": ImageDeleteResponse;
  "image_resume_request": ImageResumeRequest;
  "image_resume_response": ImageResumeResponse;
}

/**
 * Maps request event type to its corresponding response event type
 */
export interface CommandRequestResponseMap {
  "container_create_request": "container_create_response";
  "container_get_request": "container_get_response";
  "container_list_request": "container_list_response";
  "agent_run_request": "agent_run_response";
  "agent_get_request": "agent_get_response";
  "agent_list_request": "agent_list_response";
  "agent_destroy_request": "agent_destroy_response";
  "agent_destroy_all_request": "agent_destroy_all_response";
  "agent_receive_request": "agent_receive_response";
  "agent_interrupt_request": "agent_interrupt_response";
  "image_snapshot_request": "image_snapshot_response";
  "image_list_request": "image_list_response";
  "image_get_request": "image_get_response";
  "image_delete_request": "image_delete_response";
  "image_resume_request": "image_resume_response";
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
export type RequestDataFor<T extends CommandRequestType> = Omit<CommandEventMap[T]["data"], "requestId">;
