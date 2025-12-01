/**
 * AgentX - Platform API Implementation
 *
 * The central entry point for all agent operations.
 * Runtime determines the execution environment (Node.js, Browser, etc.)
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(definition, { apiKey: "xxx" });
 * ```
 */

import type { AgentX, ProviderKey, LoggerFactory, Runtime } from "@deepractice-ai/agentx-types";
import { LoggerFactoryKey } from "@deepractice-ai/agentx-types";
import { AgentEngine } from "@deepractice-ai/agentx-engine";
import { createLogger, setLoggerFactory } from "@deepractice-ai/agentx-logger";
import {
  AgentManager,
  SessionManagerImpl,
  ErrorManager,
  DefinitionManagerImpl,
  ImageManagerImpl,
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
 * Create AgentX instance with Runtime
 *
 * @param runtime - Runtime provides infrastructure (Container, Sandbox, Driver)
 * @returns AgentX instance
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(definition, { apiKey: "xxx" });
 * ```
 */
export function createAgentX(runtime: Runtime): AgentX {
  logger.info("Creating AgentX instance", { runtime: runtime.name });

  // Check repository
  if (!runtime.repository) {
    throw new Error("Runtime must have a repository for persistence");
  }

  // Create shared infrastructure
  const engine = new AgentEngine();

  // Create managers
  const errorManager = new ErrorManager();
  const definitionManager = new DefinitionManagerImpl(runtime.repository);
  const imageManager = new ImageManagerImpl(runtime.repository);
  const agentManager = new AgentManager(runtime, engine, errorManager);

  // Create session manager with repository and agent factory
  const sessionManager = new SessionManagerImpl(runtime.repository, (definition, config) =>
    agentManager.create(definition, config)
  );

  // Create provider registry
  const registry = new ProviderRegistry();

  logger.debug("AgentX instance created", { runtime: runtime.name });

  return {
    mode: "local",
    definitions: definitionManager,
    images: imageManager,
    agents: agentManager,
    sessions: sessionManager,
    errors: errorManager,
    provide: <T>(key: ProviderKey<T>, provider: T) => registry.provide(key, provider),
    resolve: <T>(key: ProviderKey<T>) => registry.resolve(key),
  };
}
