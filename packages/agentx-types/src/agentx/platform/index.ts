/**
 * Platform module - Remote platform management
 *
 * - PlatformManager: TypeScript API (agentx.platform.*)
 * - PlatformEndpoint: HTTP API contracts
 *
 * Only available in Remote mode (AgentXRemote).
 */

export type { PlatformManager } from "./PlatformManager";

// Endpoint types
export type {
  PlatformInfo,
  HealthStatus,
  GetInfoEndpoint,
  GetHealthEndpoint,
} from "./PlatformEndpoint";
