/**
 * AgentRegistry - Runtime agent instance manager
 *
 * Manages active agent instances for server-side applications.
 * Provides lifecycle management for Agent sessions.
 *
 * Key responsibilities:
 * - Create and initialize agent instances
 * - Maintain registry of active agents (sessionId → AgentService)
 * - Destroy agents and cleanup resources
 * - Query active sessions
 *
 * Design principles:
 * - In-memory only (not persistent)
 * - Thread-safe operations
 * - Clear lifecycle management
 * - Separation from transport layer (SSE/HTTP)
 *
 * @example Basic usage
 * ```typescript
 * const registry = new AgentRegistry();
 *
 * // Create an agent session
 * const agent = await registry.createSession("session-123", async () => {
 *   const agent = ClaudeAgent.create({ apiKey: "xxx" });
 *   return agent;
 * });
 *
 * // Get existing agent
 * const agent = registry.getSession("session-123");
 *
 * // Destroy agent
 * await registry.destroySession("session-123");
 * ```
 *
 * @example With auto-cleanup
 * ```typescript
 * const registry = new AgentRegistry({
 *   sessionTimeout: 30 * 60 * 1000, // 30 minutes
 *   onSessionDestroy: (sessionId) => {
 *     console.log(`Session ${sessionId} destroyed`);
 *   }
 * });
 * ```
 */

import type { AgentInstance } from "./AgentInstance";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * AgentRegistry configuration
 */
export interface AgentRegistryConfig {
  /**
   * Session timeout in milliseconds
   * If specified, sessions will be automatically destroyed after this duration of inactivity
   */
  sessionTimeout?: number;

  /**
   * Callback when a session is destroyed
   */
  onSessionDestroy?: (sessionId: string) => void | Promise<void>;

  /**
   * Logger instance
   */
  logger?: LoggerProvider;
}

/**
 * Session metadata
 */
interface SessionMetadata {
  agent: AgentInstance;
  createdAt: Date;
  lastActivityAt: Date;
  timeoutHandle?: NodeJS.Timeout;
}

/**
 * AgentRegistry
 *
 * Manages runtime agent instances
 */
export class AgentRegistry {
  private readonly agents = new Map<string, SessionMetadata>();
  private readonly config: AgentRegistryConfig;
  private readonly logger: LoggerProvider;

  constructor(config: AgentRegistryConfig = {}) {
    this.config = config;
    this.logger = config.logger || createLogger("core/registry/AgentRegistry");
  }

  /**
   * Create a new agent session
   *
   * @param sessionId - Unique session identifier
   * @param factory - Factory function to create the agent
   * @returns Created agent instance
   * @throws Error if session already exists
   */
  async createSession(
    sessionId: string,
    factory: () => Promise<AgentInstance> | AgentInstance
  ): Promise<AgentInstance> {
    if (this.agents.has(sessionId)) {
      throw new Error(`Session already exists: ${sessionId}`);
    }

    this.logger.info("Creating agent session", { sessionId });

    const agent = await factory();
    await agent.initialize();

    const metadata: SessionMetadata = {
      agent,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    // Setup auto-cleanup timeout if configured
    if (this.config.sessionTimeout) {
      metadata.timeoutHandle = setTimeout(
        () => this.destroySession(sessionId),
        this.config.sessionTimeout
      );
    }

    this.agents.set(sessionId, metadata);

    this.logger.info("Agent session created", {
      sessionId,
      totalSessions: this.agents.size,
    });

    return agent;
  }

  /**
   * Get an existing agent session
   *
   * @param sessionId - Session identifier
   * @returns Agent instance or undefined if not found
   */
  getSession(sessionId: string): AgentInstance | undefined {
    const metadata = this.agents.get(sessionId);
    if (metadata) {
      // Update last activity time
      metadata.lastActivityAt = new Date();

      // Reset timeout if configured
      if (metadata.timeoutHandle) {
        clearTimeout(metadata.timeoutHandle);
        metadata.timeoutHandle = setTimeout(
          () => this.destroySession(sessionId),
          this.config.sessionTimeout!
        );
      }

      return metadata.agent;
    }
    return undefined;
  }

  /**
   * Check if a session exists
   *
   * @param sessionId - Session identifier
   * @returns True if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.agents.has(sessionId);
  }

  /**
   * Destroy an agent session
   *
   * @param sessionId - Session identifier
   * @returns True if session was destroyed, false if not found
   */
  async destroySession(sessionId: string): Promise<boolean> {
    const metadata = this.agents.get(sessionId);
    if (!metadata) {
      return false;
    }

    this.logger.info("Destroying agent session", { sessionId });

    // Clear timeout
    if (metadata.timeoutHandle) {
      clearTimeout(metadata.timeoutHandle);
    }

    // Destroy agent
    try {
      await metadata.agent.destroy();
    } catch (error) {
      this.logger.error("Error destroying agent", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Remove from registry
    this.agents.delete(sessionId);

    this.logger.info("Agent session destroyed", {
      sessionId,
      totalSessions: this.agents.size,
    });

    // Call destroy callback
    if (this.config.onSessionDestroy) {
      try {
        await this.config.onSessionDestroy(sessionId);
      } catch (error) {
        this.logger.error("Error in onSessionDestroy callback", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return true;
  }

  /**
   * Get all active session IDs
   *
   * @returns Array of session IDs
   */
  getAllSessionIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get total number of active sessions
   *
   * @returns Session count
   */
  getSessionCount(): number {
    return this.agents.size;
  }

  /**
   * Get session metadata
   *
   * @param sessionId - Session identifier
   * @returns Session metadata or undefined
   */
  getSessionMetadata(sessionId: string): { createdAt: Date; lastActivityAt: Date } | undefined {
    const metadata = this.agents.get(sessionId);
    if (metadata) {
      return {
        createdAt: metadata.createdAt,
        lastActivityAt: metadata.lastActivityAt,
      };
    }
    return undefined;
  }

  /**
   * Destroy all sessions
   *
   * @returns Number of sessions destroyed
   */
  async destroyAll(): Promise<number> {
    const sessionIds = this.getAllSessionIds();
    let count = 0;

    for (const sessionId of sessionIds) {
      if (await this.destroySession(sessionId)) {
        count++;
      }
    }

    this.logger.info("All sessions destroyed", { count });

    return count;
  }
}
