/**
 * NodeRuntime - Node.js Runtime implementation
 *
 * "Define Once, Run Anywhere"
 *
 * Provides Runtime for Node.js with Claude driver.
 * Runtime is pure infrastructure - provides create functions for technical components.
 *
 * Container lifecycle (ContainerManager) is at AgentX layer, not here.
 */

import type {
  Runtime,
  Sandbox,
  RuntimeDriver,
  AgentContext,
  AgentDefinition,
  Repository,
  Workspace,
  LLMProvider,
  Logger,
  LoggerFactory,
  AnyEnvironmentEvent,
  Unsubscribe,
  EcosystemEventHandler,
} from "@agentxjs/types";
import { Subject } from "rxjs";
import { createLogger as createCommonLogger, setLoggerFactory } from "@agentxjs/common";
import { createClaudeDriver } from "./driver/ClaudeDriver";
import type { LLMSupply } from "./llm";
import { envLLM, sqlite, fileLogger } from "./providers";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import type { EnvLLMConfig, SQLiteConfig, FileLoggerConfig } from "./providers";

const logger = createCommonLogger("node/NodeRuntime");

// ============================================================================
// NodeRuntimeConfig - Configuration for nodeRuntime factory
// ============================================================================

/**
 * Node Runtime Configuration
 *
 * All fields are optional. Defaults are used if not provided.
 */
export interface NodeRuntimeConfig {
  /**
   * LLM provider configuration
   * @default envLLM() - reads from environment variables
   */
  llm?: LLMProvider<LLMSupply> | EnvLLMConfig;

  /**
   * Repository configuration
   * @default sqlite() - uses ~/.agentx/data/agentx.db
   */
  repository?: Repository | SQLiteConfig;

  /**
   * Logger factory configuration
   * @default fileLogger() - writes to ~/.agentx/logs/
   */
  logger?: LoggerFactory | FileLoggerConfig;
}

// ============================================================================
// NodeSandbox - Node.js Sandbox with EnvLLMProvider
// ============================================================================

class NodeSandbox implements Sandbox {
  readonly name: string;
  readonly workspace: Workspace;
  readonly llm: LLMProvider<LLMSupply>;

  constructor(name: string, workspace: Workspace, llmProvider: LLMProvider<LLMSupply>) {
    this.name = name;
    this.workspace = workspace;
    this.llm = llmProvider;
  }
}

// ============================================================================
// NodeRuntime - Main Runtime implementation
// ============================================================================

/**
 * Helper to check if value is an instance (has methods) vs plain config object
 */
function isInstance<T>(value: unknown, methodName: string): value is T {
  return typeof value === "object" && value !== null && methodName in value;
}

/**
 * NodeRuntime - Runtime for Node.js with Claude driver
 *
 * Provides create functions for technical components:
 * - createSandbox: Creates isolated Sandbox environments
 * - createDriver: Creates ClaudeDriver instances
 * - createLogger: Creates Logger instances
 *
 * Supports dependency injection via config:
 * - llm: LLM provider (default: envLLM - reads from environment)
 * - repository: Data persistence (default: sqlite)
 * - logger: Logging factory (default: fileLogger)
 *
 * Environment Variables (for default envLLM):
 * - LLM_PROVIDER_KEY (required) - API key for LLM provider
 * - LLM_PROVIDER_URL (optional) - Base URL for API endpoint
 * - LLM_PROVIDER_MODEL (optional) - Model name
 */
class NodeRuntime implements Runtime {
  readonly name = "node";
  readonly repository: Repository;
  private readonly loggerFactory: LoggerFactory;
  private readonly llmProvider: LLMProvider<LLMSupply>;
  private readonly basePath: string;

  // Ecosystem event bus
  private readonly eventSubject = new Subject<AnyEnvironmentEvent>();

  constructor(config: NodeRuntimeConfig = {}) {
    // Set base path for all agentx data
    this.basePath = join(homedir(), ".agentx");

    // Resolve logger factory (first, so we can log during initialization)
    if (isInstance<LoggerFactory>(config.logger, "getLogger")) {
      this.loggerFactory = config.logger;
    } else {
      this.loggerFactory = fileLogger(config.logger);
    }

    // Set as global logger factory
    setLoggerFactory(this.loggerFactory);

    // Resolve LLM provider
    if (isInstance<LLMProvider<LLMSupply>>(config.llm, "provide")) {
      this.llmProvider = config.llm;
    } else {
      this.llmProvider = envLLM(config.llm);
    }

    // Resolve repository
    if (isInstance<Repository>(config.repository, "saveImage")) {
      this.repository = config.repository;
    } else {
      this.repository = sqlite(config.repository);
    }

    logger.info("NodeRuntime initialized");
  }

  /**
   * Create a Sandbox for resource isolation
   *
   * @param containerId - Container identifier, determines isolation boundary
   * @returns New Sandbox instance with Workspace and LLM provider
   */
  createSandbox(containerId: string): Sandbox {
    logger.debug("Creating sandbox", { containerId });

    // Create workspace with path under ~/.agentx/containers/{containerId}/workspace/
    // Container directory can hold other resources in the future (logs, config, etc.)
    const workspacePath = `${this.basePath}/containers/${containerId}/workspace`;

    // Ensure workspace directory exists (lazy creation on first use)
    mkdirSync(workspacePath, { recursive: true });

    const workspace: Workspace = {
      id: containerId,
      name: containerId,
      path: workspacePath,
    };

    logger.debug("Sandbox created", { containerId, workspacePath });

    return new NodeSandbox(containerId, workspace, this.llmProvider);
  }

  /**
   * Create a RuntimeDriver
   *
   * Merges AgentDefinition (business config) with Runtime config (infrastructure).
   *
   * @param definition - Agent definition (business config)
   * @param context - Agent context (identity)
   * @param sandbox - Sandbox for isolation
   * @returns New RuntimeDriver instance
   */
  createDriver(
    definition: AgentDefinition,
    context: AgentContext,
    sandbox: Sandbox
  ): RuntimeDriver {
    logger.debug("Creating driver", { agentId: context.agentId, name: definition.name });

    // Get LLM config from sandbox (provided by EnvLLMProvider)
    const llmSupply = (sandbox.llm as LLMProvider<LLMSupply>).provide();

    // Merge AgentDefinition (business) + LLMSupply (infrastructure)
    const driverConfig = {
      apiKey: llmSupply.apiKey,
      baseUrl: llmSupply.baseUrl,
      model: llmSupply.model,
      systemPrompt: definition.systemPrompt,
    };

    return createClaudeDriver(driverConfig, context, sandbox);
  }

  /**
   * Create a Logger instance
   *
   * @param name - Logger name (typically module path like "engine/AgentEngine")
   * @returns Logger instance
   */
  createLogger(name: string): Logger {
    return this.loggerFactory.getLogger(name);
  }

  // ============================================================================
  // Ecosystem Interface Implementation
  // ============================================================================

  /**
   * Subscribe to all ecosystem events
   *
   * @param handler - Callback invoked for each event
   * @returns Unsubscribe function
   */
  on(handler: EcosystemEventHandler<AnyEnvironmentEvent>): Unsubscribe {
    const subscription = this.eventSubject.subscribe(handler);
    return () => subscription.unsubscribe();
  }

  /**
   * Emit an event to the ecosystem
   * Used internally by Receptors
   *
   * @param event - The event to emit
   */
  emit(event: AnyEnvironmentEvent): void {
    this.eventSubject.next(event);
  }

  /**
   * Dispose the runtime and clean up resources
   */
  dispose(): void {
    this.eventSubject.complete();
    logger.info("NodeRuntime disposed");
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Node.js Runtime with optional configuration
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { nodeRuntime, envLLM, sqlite } from "agentxjs/runtime/node";
 *
 * // Use all defaults
 * createAgentX(nodeRuntime());
 *
 * // Custom configuration
 * createAgentX(nodeRuntime({
 *   llm: envLLM({ model: "claude-sonnet-4" }),
 *   repository: sqlite({ path: "/custom/db.sqlite" }),
 * }));
 *
 * // Simple config (auto-wrapped with factory)
 * createAgentX(nodeRuntime({
 *   llm: { model: "claude-sonnet-4" },
 *   repository: { path: "/custom/db.sqlite" },
 * }));
 * ```
 */
export function nodeRuntime(config?: NodeRuntimeConfig): Runtime {
  return new NodeRuntime(config);
}

// ============================================================================
// Legacy Export (for backward compatibility)
// ============================================================================

/**
 * Node.js Runtime singleton (legacy)
 *
 * @deprecated Use `nodeRuntime()` factory instead
 *
 * @example
 * ```typescript
 * // Old way (deprecated)
 * import { runtime } from "agentxjs/runtime/node";
 * createAgentX(runtime);
 *
 * // New way (recommended)
 * import { nodeRuntime } from "agentxjs/runtime/node";
 * createAgentX(nodeRuntime());
 * ```
 */
export const runtime: Runtime = new NodeRuntime();

// Also export class for advanced use
export { NodeRuntime };
