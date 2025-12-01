/**
 * Managers module
 *
 * Provides manager implementations for AgentX platform.
 *
 * Directory structure:
 * - definition/ - DefinitionManagerImpl
 * - image/      - ImageManagerImpl
 * - agent/      - AgentManager (uses Runtime)
 * - session/    - SessionManagerImpl
 * - error/      - ErrorManager
 * - remote/     - PlatformManager, HttpClient
 */

// Definition manager
export { DefinitionManagerImpl } from "./definition";

// Image manager
export { ImageManagerImpl } from "./image";

// Agent manager (uses Runtime)
export { AgentManager } from "./agent";

// Session manager
export { SessionManagerImpl } from "./session";

// Error manager (Local only)
export { ErrorManager } from "./error";

// Remote utilities
export { PlatformManager } from "./remote/PlatformManager";
export { createHttpClient, ApiError } from "./remote/HttpClient";
export type { HttpClientOptions, KyInstance } from "./remote/HttpClient";
