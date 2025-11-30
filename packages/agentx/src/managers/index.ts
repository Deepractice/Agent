/**
 * Managers module
 *
 * Provides manager implementations for AgentX platform.
 *
 * Directory structure:
 * - agent/     - AgentManager (uses Runtime)
 * - session/   - LocalSessionManager, RemoteSessionManager
 * - error/     - ErrorManager
 * - remote/    - PlatformManager, HttpClient
 */

// Agent manager (uses Runtime)
export { AgentManager } from "./agent";

// Session managers
export { LocalSessionManager, RemoteSessionManager } from "./session";

// Error manager (Local only)
export { ErrorManager } from "./error";

// Remote utilities
export { PlatformManager } from "./remote/PlatformManager";
export { createHttpClient, ApiError } from "./remote/HttpClient";
export type { HttpClientOptions, KyInstance } from "./remote/HttpClient";
