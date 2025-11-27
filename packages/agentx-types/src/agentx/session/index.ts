/**
 * Session module - Session management
 *
 * - SessionManager: TypeScript API (agentx.sessions.*)
 * - SessionEndpoint: HTTP API contracts
 *
 * Has Local/Remote variants:
 * - LocalSessionManager: sync create()
 * - RemoteSessionManager: async create() + sync()
 */

export type { SessionManager } from "./SessionManager";
export type { LocalSessionManager } from "./LocalSessionManager";
export type { RemoteSessionManager } from "./RemoteSessionManager";

// Endpoint types
export type {
  ListSessionsResponse,
  CreateSessionEndpoint,
  GetSessionEndpoint,
  ListSessionsEndpoint,
  DestroySessionEndpoint,
} from "./SessionEndpoint";
