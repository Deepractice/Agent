/**
 * AgentX - Platform API Implementation
 *
 * The central entry point for all agent operations.
 * Supports two modes:
 * - Local: Direct in-memory operations
 * - Remote: Operations via network to remote AgentX server
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 *
 * // Local mode (default)
 * const local = createAgentX();
 * const agent = local.agents.create(definition, config);
 *
 * // Remote mode
 * const remote = createAgentX({
 *   mode: 'remote',
 *   remote: { serverUrl: "http://localhost:5200/agentx" }
 * });
 * const info = await remote.platform.getInfo();
 * ```
 */

import type {
  AgentX,
  AgentXLocal,
  AgentXRemote,
  AgentXOptions,
  AgentXRemoteOptions,
  ProviderKey,
  LoggerFactory,
} from "@deepractice-ai/agentx-types";
import { LoggerFactoryKey } from "@deepractice-ai/agentx-types";
import { MemoryAgentContainer } from "@deepractice-ai/agentx-agent";
import { AgentEngine } from "@deepractice-ai/agentx-engine";
import { createLogger, setLoggerFactory } from "@deepractice-ai/agentx-logger";
import {
  LocalAgentManager,
  LocalSessionManager,
  RemoteSessionManager,
  ErrorManager,
  PlatformManager,
  createHttpClient,
} from "./managers";

const logger = createLogger("agentx/AgentX");

/**
 * Provider registry for dependency injection
 */
class ProviderRegistry {
  private providers = new Map<symbol, unknown>();

  provide<T>(key: ProviderKey<T>, provider: T): void {
    this.providers.set(key.id, provider);

    // Special handling for built-in provider keys
    if (key.id === LoggerFactoryKey.id) {
      setLoggerFactory(provider as LoggerFactory);
    }
  }

  resolve<T>(key: ProviderKey<T>): T | undefined {
    return this.providers.get(key.id) as T | undefined;
  }
}

/**
 * Type guard for remote options
 */
function isRemoteOptions(options?: AgentXOptions): options is AgentXRemoteOptions {
  return options?.mode === "remote";
}

/**
 * Create a Local AgentX instance
 */
function createLocalAgentX(): AgentXLocal {
  logger.info("Creating local AgentX instance");

  // Create shared infrastructure
  const container = new MemoryAgentContainer();
  const engine = new AgentEngine();

  // Create managers
  const errorManager = new ErrorManager();
  const sessionManager = new LocalSessionManager();
  const agentManager = new LocalAgentManager(container, engine, errorManager);

  // Create provider registry
  const registry = new ProviderRegistry();

  logger.debug("Local AgentX instance created");

  return {
    mode: "local",
    agents: agentManager,
    sessions: sessionManager,
    errors: errorManager,
    provide: <T>(key: ProviderKey<T>, provider: T) => registry.provide(key, provider),
    resolve: <T>(key: ProviderKey<T>) => registry.resolve(key),
  };
}

/**
 * Create a Remote AgentX instance
 *
 * Remote mode connects to a remote AgentX server via HTTP.
 * Agent definitions use drivers that connect to the server (e.g., SSEDriver).
 */
function createRemoteAgentX(options: AgentXRemoteOptions): AgentXRemote {
  logger.info("Creating remote AgentX instance", {
    serverUrl: options.remote.serverUrl,
  });

  // Create HTTP client
  const http = createHttpClient({
    baseUrl: options.remote.serverUrl,
    headers: options.remote.headers,
  });

  // Create shared infrastructure (same as local)
  const container = new MemoryAgentContainer();
  const engine = new AgentEngine();
  const errorManager = new ErrorManager();

  // Create managers
  const agentManager = new LocalAgentManager(container, engine, errorManager);
  const sessionManager = new RemoteSessionManager(http);
  const platformManager = new PlatformManager(http);

  // Create provider registry
  const registry = new ProviderRegistry();

  logger.debug("Remote AgentX instance created");

  return {
    mode: "remote",
    agents: agentManager,
    sessions: sessionManager,
    platform: platformManager,
    provide: <T>(key: ProviderKey<T>, provider: T) => registry.provide(key, provider),
    resolve: <T>(key: ProviderKey<T>) => registry.resolve(key),
  };
}

/**
 * Create a new AgentX instance
 *
 * @example
 * ```typescript
 * // Local mode (default)
 * const local = createAgentX();
 * const local = createAgentX({ mode: 'local' });
 *
 * // Remote mode
 * const remote = createAgentX({
 *   mode: 'remote',
 *   remote: { serverUrl: "http://localhost:5200/agentx" }
 * });
 * ```
 */
export function createAgentX(options?: AgentXOptions): AgentX {
  if (isRemoteOptions(options)) {
    return createRemoteAgentX(options);
  }
  return createLocalAgentX();
}
