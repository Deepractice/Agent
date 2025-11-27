/**
 * LocalSessionManager - Local mode session management
 *
 * Manages conversation sessions for agents in local mode.
 * Sessions are stored in memory and can be accessed synchronously.
 */

import type {
  LocalSessionManager as ILocalSessionManager,
  Session,
} from "@deepractice-ai/agentx-types";

/**
 * Local session manager implementation
 */
export class LocalSessionManager implements ILocalSessionManager {
  private readonly sessions: Map<string, Session> = new Map();
  private readonly agentSessions: Map<string, Set<string>> = new Map();

  /**
   * Create a new session for an agent (synchronous in local mode)
   */
  create(agentId: string): Session {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const session: Session = {
      sessionId,
      agentId,
      createdAt: Date.now(),
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track by agent
    if (!this.agentSessions.has(agentId)) {
      this.agentSessions.set(agentId, new Set());
    }
    this.agentSessions.get(agentId)!.add(sessionId);

    return session;
  }

  /**
   * Get an existing session by ID
   */
  async get(sessionId: string): Promise<Session | undefined> {
    return this.sessions.get(sessionId);
  }

  /**
   * List all sessions for an agent
   */
  async listByAgent(agentId: string): Promise<Session[]> {
    const sessionIds = this.agentSessions.get(agentId);
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id)!)
      .filter(Boolean);
  }

  /**
   * Destroy a session
   */
  async destroy(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove from agent tracking
      this.agentSessions.get(session.agentId)?.delete(sessionId);

      // Remove session
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Destroy all sessions for an agent
   * Called internally when an agent is destroyed
   */
  async destroyByAgent(agentId: string): Promise<void> {
    const sessionIds = this.agentSessions.get(agentId);
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.agentSessions.delete(agentId);
    }
  }
}
