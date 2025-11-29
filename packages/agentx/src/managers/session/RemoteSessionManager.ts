/**
 * RemoteSessionManager - Remote mode session management
 *
 * Manages conversation sessions via HTTP API to remote AgentX server.
 * Sessions are cached locally and can be synced with the server.
 */

import type {
  RemoteSessionManager as IRemoteSessionManager,
  Session,
  ListSessionsResponse,
} from "@deepractice-ai/agentx-types";
import type { KyInstance } from "../remote/HttpClient";

/**
 * Remote session manager implementation
 */
export class RemoteSessionManager implements IRemoteSessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly agentSessions = new Map<string, Set<string>>();

  constructor(private readonly http: KyInstance) {}

  /**
   * Create a new session for an agent (async in remote mode)
   */
  async create(agentId: string): Promise<Session> {
    const session = await this.http.post(`agents/${agentId}/sessions`).json<Session>();

    // Cache locally
    this.sessions.set(session.sessionId, session);

    if (!this.agentSessions.has(agentId)) {
      this.agentSessions.set(agentId, new Set());
    }
    this.agentSessions.get(agentId)!.add(session.sessionId);

    return session;
  }

  /**
   * Get an existing session by ID
   */
  async get(sessionId: string): Promise<Session | undefined> {
    // Check cache first
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    try {
      const session = await this.http.get(`sessions/${sessionId}`).json<Session>();

      // Cache it
      this.sessions.set(sessionId, session);
      if (!this.agentSessions.has(session.agentId)) {
        this.agentSessions.set(session.agentId, new Set());
      }
      this.agentSessions.get(session.agentId)!.add(sessionId);

      return session;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * List all sessions for an agent
   */
  async listByAgent(agentId: string): Promise<Session[]> {
    const response = await this.http.get(`agents/${agentId}/sessions`).json<ListSessionsResponse>();

    // Update cache
    for (const session of response.sessions) {
      this.sessions.set(session.sessionId, session);
      if (!this.agentSessions.has(agentId)) {
        this.agentSessions.set(agentId, new Set());
      }
      this.agentSessions.get(agentId)!.add(session.sessionId);
    }

    return response.sessions;
  }

  /**
   * Destroy a session
   */
  async destroy(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.agentSessions.get(session.agentId)?.delete(sessionId);
      this.sessions.delete(sessionId);
    }

    try {
      await this.http.delete(`sessions/${sessionId}`);
    } catch (error: any) {
      // Ignore 404 - session already destroyed
      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  /**
   * Destroy all sessions for an agent
   */
  async destroyByAgent(agentId: string): Promise<void> {
    const sessionIds = this.agentSessions.get(agentId);
    if (sessionIds) {
      await Promise.all(Array.from(sessionIds).map((id) => this.destroy(id)));
      this.agentSessions.delete(agentId);
    }
  }

  /**
   * Sync local session cache with remote server
   */
  async sync(): Promise<void> {
    // Clear local cache
    this.sessions.clear();
    this.agentSessions.clear();

    // We can't sync all sessions without knowing agent IDs
    // This is typically called per-agent or after getting agent list
  }
}
