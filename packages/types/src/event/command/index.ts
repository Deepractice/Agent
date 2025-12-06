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
  AgentRunRequest,
  AgentRunResponse,
  AgentGetRequest,
  AgentGetResponse,
  AgentListRequest,
  AgentListResponse,
  AgentDestroyRequest,
  AgentDestroyResponse,
  AgentDestroyAllRequest,
  AgentDestroyAllResponse,
  AgentReceiveRequest,
  AgentReceiveResponse,
  AgentInterruptRequest,
  AgentInterruptResponse,
  // Image commands
  ImageSnapshotRequest,
  ImageSnapshotResponse,
  ImageListRequest,
  ImageListResponse,
  ImageGetRequest,
  ImageGetResponse,
  ImageDeleteRequest,
  ImageDeleteResponse,
  ImageResumeRequest,
  ImageResumeResponse,
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

export {
  isCommandEvent,
  isCommandRequest,
  isCommandResponse,
} from "./CommandEvent";
