/**
 * PlatformManager - Remote platform information
 *
 * Provides access to remote AgentX server information.
 * Only available in Remote mode.
 *
 * @example
 * ```typescript
 * const agentx = createAgentX({ serverUrl: "http://..." });
 *
 * // Get platform info
 * const info = await agentx.platform.getInfo();
 * console.log(info.version);
 *
 * // Check health
 * const health = await agentx.platform.getHealth();
 * console.log(health.status);
 * ```
 */

import type { PlatformInfo, HealthStatus } from "./PlatformEndpoint";

/**
 * Platform management interface (Remote only)
 */
export interface PlatformManager {
  /**
   * Get platform information
   */
  getInfo(): Promise<PlatformInfo>;

  /**
   * Get platform health status
   */
  getHealth(): Promise<HealthStatus>;
}
