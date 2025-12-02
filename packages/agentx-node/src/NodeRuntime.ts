/**
 * NodeRuntime - Node.js Runtime implementation
 *
 * "Define Once, Run Anywhere"
 *
 * Provides Runtime for Node.js with Claude driver.
 * RuntimeConfig is collected from environment (env vars, config files).
 * AgentDefinition (business config) is passed by user.
 */

import type {
  Runtime,
  Container,
  Sandbox,
  RuntimeDriver,
  AgentContext,
  AgentDefinition,
  Repository,
  OS,
  LLMProvider,
  Agent,
  AgentImage,
  Session,
  LoggerFactory,
} from "@deepractice-ai/agentx-types";
import { AgentInstance } from "@deepractice-ai/agentx-agent";
import { AgentEngine } from "@deepractice-ai/agentx-engine";
import { createLogger, setLoggerFactory } from "@deepractice-ai/agentx-common";
import { createClaudeDriver, type ClaudeDriverOptions } from "./ClaudeDriver";
import { SQLiteRepository } from "./repository";
import { FileLoggerFactory } from "./logger";
import { EnvLLMProvider, type LLMSupply } from "./llm";
import { homedir } from "node:os";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const logger = createLogger("node/NodeRuntime");

// ============================================================================
// NodeContainer - Node.js Container implementation
// ============================================================================

/**
 * NodeContainer - Server-side Container implementation
 *
 * Manages Agent lifecycle with Claude SDK integration.
 * Persists driverState to Repository for resume capability.
 */
class NodeContainer implements Container {
  readonly id: string;
  private readonly agents = new Map<string, Agent>();
  private readonly runtime: Runtime;
  private readonly engine: AgentEngine;
  private readonly repository: Repository;

  constructor(id: string, runtime: Runtime, engine: AgentEngine, repository: Repository) {
    this.id = id;
    this.runtime = runtime;
    this.engine = engine;
    this.repository = repository;
  }

  async run(image: AgentImage): Promise<Agent> {
    logger.info("Running agent from image", { imageId: image.imageId });

    // Generate agentId
    const agentId = this.generateAgentId();

    // Create context
    const context: AgentContext = {
      agentId,
      createdAt: Date.now(),
    };

    // Create sandbox
    const sandbox = this.runtime.createSandbox(`sandbox-${agentId}`);

    // Get LLM config from sandbox (provided by EnvLLMProvider)
    const llmSupply = (sandbox.llm as LLMProvider<LLMSupply>).provide();

    // Create driver config
    const driverConfig = {
      apiKey: llmSupply.apiKey,
      baseUrl: llmSupply.baseUrl,
      model: llmSupply.model,
      systemPrompt: image.definition.systemPrompt,
    };

    // Create driver with session ID capture callback
    const driverOptions: ClaudeDriverOptions = {
      onSessionIdCaptured: async (sdkSessionId) => {
        // Persist driverState to Repository
        await this.updateImageDriverState(image.imageId, { sdkSessionId });
        logger.debug("Driver state persisted", {
          imageId: image.imageId,
          sdkSessionId,
        });
      },
    };

    const driver = createClaudeDriver(driverConfig, context, sandbox, driverOptions);

    // Create agent
    const agent = new AgentInstance(image.definition, context, this.engine, driver, sandbox);

    // Register agent
    this.agents.set(agentId, agent);

    logger.info("Agent started from image", {
      agentId,
      imageId: image.imageId,
      definitionName: image.definition.name,
    });

    return agent;
  }

  async resume(session: Session): Promise<Agent> {
    logger.info("Resuming agent from session", {
      sessionId: session.sessionId,
      imageId: session.imageId,
    });

    // Get image from repository
    const imageRecord = await this.repository.findImageById(session.imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${session.imageId}`);
    }

    // Get sdkSessionId from persisted driverState
    const sdkSessionId = imageRecord.driverState?.sdkSessionId as string | undefined;

    // Generate agentId
    const agentId = this.generateAgentId();

    // Create context
    const context: AgentContext = {
      agentId,
      createdAt: Date.now(),
    };

    // Create sandbox
    const sandbox = this.runtime.createSandbox(`sandbox-${agentId}`);

    // Get LLM config from sandbox (provided by EnvLLMProvider)
    const llmSupply = (sandbox.llm as LLMProvider<LLMSupply>).provide();

    // Create driver config
    const definition = imageRecord.definition as unknown as AgentDefinition;
    const driverConfig = {
      apiKey: llmSupply.apiKey,
      baseUrl: llmSupply.baseUrl,
      model: llmSupply.model,
      systemPrompt: definition.systemPrompt,
    };

    // Create driver with resume session ID and capture callback
    const driverOptions: ClaudeDriverOptions = {
      resumeSessionId: sdkSessionId,
      onSessionIdCaptured: async (newSdkSessionId) => {
        // Update driverState (may be new if resume created a fork)
        await this.updateImageDriverState(session.imageId, { sdkSessionId: newSdkSessionId });
        logger.debug("Driver state updated on resume", {
          imageId: session.imageId,
          sdkSessionId: newSdkSessionId,
        });
      },
    };

    const driver = createClaudeDriver(driverConfig, context, sandbox, driverOptions);

    // Create agent
    const agent = new AgentInstance(definition, context, this.engine, driver, sandbox);

    // Register agent
    this.agents.set(agentId, agent);

    logger.info("Agent resumed from session", {
      agentId,
      sessionId: session.sessionId,
      imageId: session.imageId,
      hadDriverState: !!sdkSessionId,
    });

    return agent;
  }

  /**
   * Update driverState for an image in Repository
   */
  private async updateImageDriverState(
    imageId: string,
    driverState: Record<string, unknown>
  ): Promise<void> {
    const imageRecord = await this.repository.findImageById(imageId);
    if (imageRecord) {
      // Merge with existing driverState
      imageRecord.driverState = {
        ...imageRecord.driverState,
        ...driverState,
      };
      await this.repository.saveImage(imageRecord);
    }
  }

  async destroy(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      logger.warn("Agent not found for destroy", { agentId });
      return;
    }

    logger.debug("Destroying agent", { agentId });
    await agent.destroy();
    this.agents.delete(agentId);
    logger.info("Agent destroyed", { agentId });
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  async destroyAll(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    logger.debug("Destroying all agents", { count: agentIds.length });
    await Promise.all(agentIds.map((id) => this.destroy(id)));
    logger.info("All agents destroyed", { count: agentIds.length });
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// NodeSandbox - Node.js Sandbox with EnvLLMProvider
// ============================================================================

class NodeSandbox implements Sandbox {
  readonly name: string;
  readonly os: OS;
  readonly llm: LLMProvider<LLMSupply>;

  constructor(name: string, llmProvider: LLMProvider<LLMSupply>) {
    this.name = name;
    // OS resources - placeholder for now
    this.os = {
      name: "node",
      fs: null as any,
      process: null as any,
      env: null as any,
      disk: null as any,
    };
    this.llm = llmProvider;
  }
}

// ============================================================================
// NodeRuntime - Main Runtime implementation
// ============================================================================

/**
 * Default data directory for AgentX
 */
const DEFAULT_DATA_DIR = join(homedir(), ".agentx", "data");

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * NodeRuntime - Runtime for Node.js with Claude driver
 *
 * RuntimeConfig is collected from environment via EnvLLMProvider:
 * - LLM_PROVIDER_KEY (required) - API key for LLM provider
 * - LLM_PROVIDER_URL (optional) - Base URL for API endpoint
 * - LLM_PROVIDER_MODEL (optional) - Model name
 *
 * Data is stored in ~/.agentx/data/ by default.
 */
class NodeRuntime implements Runtime {
  readonly name = "node";
  readonly container: Container;
  readonly repository: Repository;
  readonly loggerFactory: LoggerFactory;
  private readonly engine: AgentEngine;
  private readonly llmProvider: LLMProvider<LLMSupply>;

  constructor(dataDir: string = DEFAULT_DATA_DIR) {
    // Ensure data directory exists
    ensureDir(dataDir);

    // Create log directory
    const logDir = join(dataDir, "..", "logs");
    ensureDir(logDir);

    // Create and configure FileLoggerFactory
    this.loggerFactory = new FileLoggerFactory({
      logDir,
      consoleOutput: true,
    });

    // Set as global logger factory
    setLoggerFactory(this.loggerFactory);

    // Create LLM provider (reads from environment)
    this.llmProvider = new EnvLLMProvider();

    // Create SQLite repository
    const dbPath = join(dataDir, "agentx.db");
    this.repository = new SQLiteRepository(dbPath);

    // Create shared engine
    this.engine = new AgentEngine();

    // Create container with runtime, engine, and repository
    this.container = new NodeContainer("node-container", this, this.engine, this.repository);

    logger.info("NodeRuntime initialized", { dataDir, dbPath, logDir });
  }

  createSandbox(name: string): Sandbox {
    logger.debug("Creating sandbox", { name });
    return new NodeSandbox(name, this.llmProvider);
  }

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
}

// ============================================================================
// Export singleton runtime
// ============================================================================

/**
 * Node.js Runtime singleton
 *
 * Requires environment variables:
 * - LLM_PROVIDER_KEY (required) - API key for LLM provider
 * - LLM_PROVIDER_URL (optional) - Base URL for API endpoint
 * - LLM_PROVIDER_MODEL (optional) - Model name (default: claude-sonnet-4-20250514)
 *
 * @example
 * ```typescript
 * import { runtime } from "@deepractice-ai/agentx-node";
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { defineAgent } from "@deepractice-ai/agentx";
 *
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);  // No config needed!
 * ```
 */
export const runtime: Runtime = new NodeRuntime();

// Also export class for advanced use
export { NodeRuntime };
