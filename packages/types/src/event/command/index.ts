/**
 * Command Events - Request/Response for Runtime operations
 *
 * All events for runtime API operations:
 * - source: "command"
 * - category: "request" | "response"
 */

export type {
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
  AgentDestroyAllRequest,
  AgentDestroyAllResponse,
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
  // Union types
  CommandRequest,
  CommandResponse,
  CommandEvent,
  CommandEventType,
} from "./CommandEvent";

export type {
  CommandEventMap,
  CommandRequestResponseMap,
  CommandRequestType,
  ResponseTypeFor,
  ResponseEventFor,
  RequestDataFor,
} from "./CommandEvent";

export { isCommandEvent, isCommandRequest, isCommandResponse } from "./CommandEvent";
