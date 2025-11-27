/**
 * Managers module
 *
 * Provides manager implementations for AgentX platform.
 *
 * Directory structure indicates Local/Remote variants:
 * - agent/     - LocalAgentManager, RemoteAgentManager
 * - session/   - LocalSessionManager, RemoteSessionManager
 * - error/     - ErrorManager (Local only)
 * - platform/  - PlatformManager (Remote only)
 */

// Agent managers
export { LocalAgentManager } from "./agent";
// export { RemoteAgentManager } from "./agent";  // TODO

// Session managers
export { LocalSessionManager } from "./session";
// export { RemoteSessionManager } from "./session";  // TODO

// Error manager (Local only)
export { ErrorManager } from "./error";

// Platform manager (Remote only)
// export { PlatformManager } from "./platform";  // TODO
