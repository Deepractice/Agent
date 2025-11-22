/**
 * SessionStore - In-memory session storage
 *
 * Stores conversation sessions with CRUD operations.
 * Can optionally auto-collect messages from agent events when used as a reactor.
 *
 * @example Basic usage
 * ```typescript
 * const store = new SessionStore();
 *
 * // Create a session
 * const session = await store.create({
 *   agentId: "claude-agent",
 *   peerId: "user-123",
 *   title: "My conversation",
 *   messages: [],
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 *
 * // Get a session
 * const session = await store.get("session-id");
 * ```
 */

import type { MessageReactor } from "@deepractice-ai/agentx-engine";
import type { Session } from "@deepractice-ai/agentx-types";
import type {
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "@deepractice-ai/agentx-event";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * Session query filter options
 */
export interface SessionQueryOptions {
  peerId?: string;
  agentId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * SessionStore
 *
 * In-memory session storage implementing MessageReactor for automatic message collection.
 */
export class SessionStore implements MessageReactor {
  readonly name = "SessionStore";

  private sessions = new Map<string, Session>();
  private logger: LoggerProvider;

  constructor() {
    this.logger = createLogger("core/session/SessionStore");
  }

  // ==================== MessageReactor Implementation ====================

  /**
   * Auto-collect user messages
   */
  async onUserMessage(event: UserMessageEvent): Promise<void> {
    await this.addMessageToSession(event.agentId, event.data);
  }

  /**
   * Auto-collect assistant messages
   */
  async onAssistantMessage(event: AssistantMessageEvent): Promise<void> {
    await this.addMessageToSession(event.agentId, event.data);
  }

  /**
   * Auto-collect tool use messages
   */
  async onToolUseMessage(event: ToolUseMessageEvent): Promise<void> {
    await this.addMessageToSession(event.agentId, event.data);
  }

  /**
   * Auto-collect error messages
   */
  async onErrorMessage(event: ErrorMessageEvent): Promise<void> {
    await this.addMessageToSession(event.agentId, event.data);
  }

  /**
   * Add message to session
   */
  private async addMessageToSession(agentId: string, message: any): Promise<void> {
    // Find session by agentId (assuming 1:1 agent:session for now)
    // TODO: Improve session lookup logic
    const session = Array.from(this.sessions.values()).find((s) => s.agentId === agentId);

    if (session) {
      session.messages.push(message);
      session.updatedAt = new Date();
      this.logger.debug("Message added to session", {
        sessionId: session.id,
        messageType: message.role,
      });
    }
  }

  // ==================== Session Management Methods ====================

  /**
   * Create a new session
   */
  async create(session: Omit<Session, "id">): Promise<Session> {
    const id = generateSessionId();
    const newSession: Session = {
      ...session,
      id,
    };

    this.sessions.set(id, newSession);

    this.logger.info("Session created", {
      sessionId: id,
      agentId: session.agentId,
      peerId: session.peerId,
    });

    return newSession;
  }

  /**
   * Get session by ID
   */
  async get(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  /**
   * Update session
   */
  async update(id: string, updates: Partial<Omit<Session, "id">>): Promise<Session | null> {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    const updatedSession: Session = {
      ...session,
      ...updates,
      id, // Ensure id is not changed
      updatedAt: new Date(),
    };

    this.sessions.set(id, updatedSession);

    this.logger.debug("Session updated", { sessionId: id });

    return updatedSession;
  }

  /**
   * Delete session
   */
  async delete(id: string): Promise<boolean> {
    const deleted = this.sessions.delete(id);

    if (deleted) {
      this.logger.info("Session deleted", { sessionId: id });
    }

    return deleted;
  }

  /**
   * Query sessions with filters
   */
  async query(options?: SessionQueryOptions): Promise<Session[]> {
    let results = Array.from(this.sessions.values());

    // Apply filters
    if (options?.peerId) {
      results = results.filter((s) => s.peerId === options.peerId);
    }

    if (options?.agentId) {
      results = results.filter((s) => s.agentId === options.agentId);
    }

    if (options?.createdAfter) {
      results = results.filter((s) => s.createdAt >= options.createdAfter!);
    }

    if (options?.createdBefore) {
      results = results.filter((s) => s.createdAt <= options.createdBefore!);
    }

    if (options?.updatedAfter) {
      results = results.filter((s) => s.updatedAt >= options.updatedAfter!);
    }

    if (options?.updatedBefore) {
      results = results.filter((s) => s.updatedAt <= options.updatedBefore!);
    }

    // Sort
    const sortBy = options?.sortBy || "createdAt";
    const sortOrder = options?.sortOrder || "desc";

    results.sort((a, b) => {
      const aValue = a[sortBy].getTime();
      const bValue = b[sortBy].getTime();
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Pagination
    if (options?.offset) {
      results = results.slice(options.offset);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get all sessions for a specific peer
   */
  async getByPeer(peerId: string): Promise<Session[]> {
    return this.query({ peerId });
  }

  /**
   * Get all sessions for a specific agent
   */
  async getByAgent(agentId: string): Promise<Session[]> {
    return this.query({ agentId });
  }

  /**
   * Delete multiple sessions
   */
  async deleteBatch(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (this.sessions.delete(id)) {
        count++;
      }
    }

    this.logger.info("Batch delete completed", { count, total: ids.length });

    return count;
  }

  /**
   * Clear all sessions
   */
  async clear(): Promise<number> {
    const count = this.sessions.size;
    this.sessions.clear();

    this.logger.warn("All sessions cleared", { count });

    return count;
  }
}
