/**
 * PlatformManager - Remote platform information
 */

import type {
  PlatformManager as IPlatformManager,
  PlatformInfo,
  HealthStatus,
} from "@deepractice-ai/agentx-types";
import type { KyInstance } from "./HttpClient";

/**
 * Platform manager implementation for Remote mode
 */
export class PlatformManager implements IPlatformManager {
  constructor(private readonly http: KyInstance) {}

  async getInfo(): Promise<PlatformInfo> {
    return this.http.get("info").json<PlatformInfo>();
  }

  async getHealth(): Promise<HealthStatus> {
    return this.http.get("health").json<HealthStatus>();
  }
}
