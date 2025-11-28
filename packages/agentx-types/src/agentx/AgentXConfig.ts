/**
 * AgentX Configuration Types
 *
 * Configuration types for AgentX instance creation.
 */

/**
 * Remote mode configuration
 */
export interface RemoteConfig {
  /**
   * Remote server URL (required)
   */
  serverUrl: string;

  /**
   * Request headers for authentication, etc.
   */
  headers?: Record<string, string>;
}
