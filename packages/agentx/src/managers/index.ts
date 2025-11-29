/**
 * Managers module
 *
 * Provides manager implementations for AgentX platform.
 *
 * Directory structure indicates Local/Remote variants:
 * - agent/     - LocalAgentManager (Remote reuses with different driver)
 * - session/   - LocalSessionManager, RemoteSessionManager
 * - error/     - ErrorManager (Local only)
 * - remote/    - PlatformManager, HttpClient (Remote only)
 */

// Agent managers
export { LocalAgentManager } from "./agent";

// Session managers
export { LocalSessionManager, RemoteSessionManager } from "./session";

// Error manager (Local only)
export { ErrorManager } from "./error";

// Remote utilities
export { PlatformManager } from "./remote/PlatformManager";
export { createHttpClient, ApiError } from "./remote/HttpClient";
export type { HttpClientOptions, KyInstance } from "./remote/HttpClient";
