/**
 * Store - State storage interface for stream processing
 *
 * A Store abstracts state persistence, allowing processors to be stateless
 * while maintaining state externally.
 *
 * @template T - The state type to store
 *
 * @example
 * ```typescript
 * const store = new MemoryStore<AgentState>();
 * store.set('agent_123', { count: 0 });
 * const state = store.get('agent_123');
 * ```
 */
export interface Store<T> {
  /**
   * Get state by ID
   * @param id - Unique identifier (e.g., agentId, sessionId)
   * @returns The stored state or undefined if not found
   */
  get(id: string): T | undefined;

  /**
   * Set state for an ID
   * @param id - Unique identifier
   * @param state - The state to store
   */
  set(id: string, state: T): void;

  /**
   * Delete state for an ID
   * @param id - Unique identifier
   */
  delete(id: string): void;

  /**
   * Check if state exists for an ID
   * @param id - Unique identifier
   * @returns True if state exists
   */
  has(id: string): boolean;
}

/**
 * MemoryStore - In-memory implementation of Store
 *
 * Stores state in a Map. Suitable for development and single-process deployments.
 * For production multi-process scenarios, use RedisStore or PostgresStore.
 *
 * @template T - The state type to store
 *
 * @example
 * ```typescript
 * const store = new MemoryStore<MyState>();
 * store.set('session_1', { count: 0 });
 * ```
 */
export class MemoryStore<T> implements Store<T> {
  private states = new Map<string, T>();

  get(id: string): T | undefined {
    return this.states.get(id);
  }

  set(id: string, state: T): void {
    this.states.set(id, state);
  }

  delete(id: string): void {
    this.states.delete(id);
  }

  has(id: string): boolean {
    return this.states.has(id);
  }

  /**
   * Clear all stored states
   */
  clear(): void {
    this.states.clear();
  }

  /**
   * Get the number of stored states
   */
  get size(): number {
    return this.states.size;
  }

  /**
   * Get all stored IDs
   */
  keys(): IterableIterator<string> {
    return this.states.keys();
  }
}
