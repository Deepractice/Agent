/**
 * Global context for agentx-core
 *
 * Manages process-level singletons:
 * - AgentEngine (shared across all agents)
 * - AgentContainer (runtime instance container)
 * - SessionRepository (session persistence)
 */

import type { AgentEngine } from "@deepractice-ai/agentx-engine";
import { MemoryAgentContainer, type AgentContainer } from "./agent";
import { MemorySessionRepository, type SessionRepository } from "./session";

/**
 * Core context
 */
export interface CoreContext {
  engine: AgentEngine;
  container: AgentContainer;
  sessionRepository: SessionRepository;
}

// Global context (process-level singleton)
let globalContext: CoreContext | null = null;

/**
 * Initialize the core context
 *
 * Must be called before using any agent APIs.
 *
 * @param engine - The AgentEngine instance (process-level singleton)
 * @param options - Optional custom implementations
 */
export function initializeCore(
  engine: AgentEngine,
  options?: {
    container?: AgentContainer;
    sessionRepository?: SessionRepository;
  }
): void {
  globalContext = {
    engine,
    container: options?.container ?? new MemoryAgentContainer(),
    sessionRepository: options?.sessionRepository ?? new MemorySessionRepository(),
  };
}

/**
 * Get the core context
 *
 * @throws Error if context is not initialized
 */
export function getContext(): CoreContext {
  if (!globalContext) {
    throw new Error(
      "[agentx-core] Context not initialized. Call initializeCore() first."
    );
  }
  return globalContext;
}

/**
 * Check if context is initialized
 */
export function isInitialized(): boolean {
  return globalContext !== null;
}

/**
 * Reset context (for testing)
 */
export function resetContext(): void {
  globalContext = null;
}
