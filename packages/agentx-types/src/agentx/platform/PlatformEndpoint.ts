/**
 * Platform Endpoints - HTTP API contracts for Platform operations
 */

import type { Endpoint } from "~/agentx/Endpoint";

// ============================================================================
// Response Types
// ============================================================================

export interface PlatformInfo {
  platform: string;
  version: string;
  agentCount: number;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  agentCount: number;
}

// ============================================================================
// Endpoints
// ============================================================================

/**
 * Get platform information
 * GET /info
 */
export interface GetInfoEndpoint extends Endpoint<"GET", "/info", void, PlatformInfo> {}

/**
 * Get health status
 * GET /health
 */
export interface GetHealthEndpoint extends Endpoint<"GET", "/health", void, HealthStatus> {}
