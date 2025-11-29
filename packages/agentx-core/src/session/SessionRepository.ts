/**
 * SessionRepository - Persistence interface for Session
 *
 * Unlike AgentRegistry (runtime only), SessionRepository is for
 * actual persistence (database, file, etc.)
 */

import type { Session } from "./Session";

/**
 * Query options for finding sessions
 */
export interface SessionQueryOptions {
  agentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * SessionRepository interface
 */
export interface SessionRepository {
  /**
   * Save a session
   */
  save(session: Session): Promise<void>;

  /**
   * Find session by ID
   */
  findById(sessionId: string): Promise<Session | undefined>;

  /**
   * Find sessions by agent ID
   */
  findByAgentId(agentId: string): Promise<Session[]>;

  /**
   * Find sessions with query options
   */
  findAll(options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * Check if session exists
   */
  exists(sessionId: string): Promise<boolean>;

  /**
   * Delete session by ID
   */
  delete(sessionId: string): Promise<boolean>;

  /**
   * Get total count
   */
  count(): Promise<number>;
}

/**
 * In-memory implementation (for testing)
 */
export class MemorySessionRepository implements SessionRepository {
  private readonly sessions: Map<string, Session> = new Map();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.sessionId, session);
  }

  async findById(sessionId: string): Promise<Session | undefined> {
    return this.sessions.get(sessionId);
  }

  async findByAgentId(agentId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter((s) => s.agentId === agentId);
  }

  async findAll(options?: SessionQueryOptions): Promise<Session[]> {
    let result = Array.from(this.sessions.values());

    if (options?.agentId) {
      result = result.filter((s) => s.agentId === options.agentId);
    }

    if (options?.offset) {
      result = result.slice(options.offset);
    }

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async count(): Promise<number> {
    return this.sessions.size;
  }
}
