/**
 * SessionService
 *
 * Service interface for managing conversation sessions.
 * Provides CRUD operations and query methods for Session persistence.
 *
 * Design principles:
 * 1. Async-first API - supports both in-memory and database backends
 * 2. Simple CRUD operations - create, read, update, delete
 * 3. Flexible querying - filter by user, agent, time range
 * 4. Batch operations - efficient multi-session handling
 *
 * @example In-memory implementation
 * ```typescript
 * class InMemorySessionService implements SessionService {
 *   private sessions = new Map<string, Session>();
 *
 *   async create(session: Omit<Session, 'id'>): Promise<Session> {
 *     const id = generateId();
 *     const newSession = { ...session, id };
 *     this.sessions.set(id, newSession);
 *     return newSession;
 *   }
 *
 *   async get(id: string): Promise<Session | null> {
 *     return this.sessions.get(id) || null;
 *   }
 * }
 * ```
 *
 * @example Database implementation
 * ```typescript
 * class DatabaseSessionService implements SessionService {
 *   constructor(private db: Database) {}
 *
 *   async create(session: Omit<Session, 'id'>): Promise<Session> {
 *     const result = await this.db.insert('sessions', session);
 *     return result;
 *   }
 *
 *   async get(id: string): Promise<Session | null> {
 *     return await this.db.findOne('sessions', { id });
 *   }
 * }
 * ```
 */

import type { Session } from "@deepractice-ai/agentx-types";

/**
 * Session query filter options
 */
export interface SessionQueryOptions {
  /**
   * Filter by peer ID (the counterpart in conversation)
   * Can be user ID, agent ID, system ID, etc.
   */
  peerId?: string;

  /**
   * Filter by agent ID
   */
  agentId?: string;

  /**
   * Filter by creation time range
   */
  createdAfter?: Date;
  createdBefore?: Date;

  /**
   * Filter by update time range
   */
  updatedAfter?: Date;
  updatedBefore?: Date;

  /**
   * Limit number of results
   */
  limit?: number;

  /**
   * Skip number of results (for pagination)
   */
  offset?: number;

  /**
   * Sort order
   * @default "desc" (newest first)
   */
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/**
 * SessionService interface
 *
 * Manages session persistence and retrieval.
 * Implementations can use in-memory storage, databases, or any other backend.
 */
export interface SessionService {
  /**
   * Create a new session
   *
   * @param session - Session data (without id)
   * @returns Created session with generated id
   */
  create(session: Omit<Session, "id">): Promise<Session>;

  /**
   * Get session by ID
   *
   * @param id - Session ID
   * @returns Session or null if not found
   */
  get(id: string): Promise<Session | null>;

  /**
   * Update an existing session
   *
   * @param id - Session ID
   * @param updates - Partial session data to update
   * @returns Updated session or null if not found
   */
  update(id: string, updates: Partial<Omit<Session, "id">>): Promise<Session | null>;

  /**
   * Delete a session
   *
   * @param id - Session ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Query sessions with filters
   *
   * @param options - Query filter options
   * @returns Array of matching sessions
   */
  query(options?: SessionQueryOptions): Promise<Session[]>;

  /**
   * Get all sessions for a specific peer
   *
   * @param peerId - Peer ID (user, agent, system, etc.)
   * @returns Array of peer's sessions
   */
  getByPeer(peerId: string): Promise<Session[]>;

  /**
   * Get all sessions for a specific agent
   *
   * @param agentId - Agent ID
   * @returns Array of agent's sessions
   */
  getByAgent(agentId: string): Promise<Session[]>;

  /**
   * Delete multiple sessions
   *
   * @param ids - Array of session IDs
   * @returns Number of deleted sessions
   */
  deleteBatch(ids: string[]): Promise<number>;

  /**
   * Clear all sessions (use with caution)
   *
   * @returns Number of deleted sessions
   */
  clear(): Promise<number>;
}
