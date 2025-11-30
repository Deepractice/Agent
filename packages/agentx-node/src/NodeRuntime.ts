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
  OS,
  LLMProvider,
} from "@deepractice-ai/agentx-types";
import type { Agent } from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";
import { createClaudeDriver } from "./ClaudeDriver";

const logger = createLogger("node/NodeRuntime");

// ============================================================================
// MemoryContainer - Simple in-memory container
// ============================================================================

class MemoryContainer implements Container {
  readonly id: string;
  private readonly agents = new Map<string, Agent>();

  constructor(id: string = "node-container") {
    this.id = id;
  }

  register(agent: Agent): void {
    this.agents.set(agent.agentId, agent);
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  getAllIds(): string[] {
    return Array.from(this.agents.keys());
  }

  count(): number {
    return this.agents.size;
  }

  clear(): void {
    this.agents.clear();
  }
}

// ============================================================================
// NoopSandbox - Placeholder Sandbox (OS resources TBD)
// ============================================================================

class NoopSandbox implements Sandbox {
  readonly name: string;
  readonly os: OS;
  readonly llm: LLMProvider;

  constructor(name: string) {
    this.name = name;
    // Placeholder - real implementation TBD
    this.os = {
      name: "noop",
      fs: null as any,
      process: null as any,
      env: null as any,
      disk: null as any,
    };
    this.llm = {
      name: "noop",
      provide: () => ({}),
    };
  }
}

// ============================================================================
// NodeRuntime - Main Runtime implementation
// ============================================================================

/**
 * NodeRuntime - Runtime for Node.js with Claude driver
 *
 * RuntimeConfig is collected from environment:
 * - ANTHROPIC_API_KEY
 * - ANTHROPIC_BASE_URL
 * - CLAUDE_MODEL (optional, defaults to claude-sonnet-4-20250514)
 */
class NodeRuntime implements Runtime {
  readonly name = "node";
  readonly container: Container;

  constructor() {
    this.container = new MemoryContainer();
  }

  createSandbox(name: string): Sandbox {
    logger.debug("Creating sandbox", { name });
    return new NoopSandbox(name);
  }

  createDriver(
    definition: AgentDefinition,
    context: AgentContext,
    sandbox: Sandbox
  ): RuntimeDriver {
    logger.debug("Creating driver", { agentId: context.agentId, name: definition.name });

    // Collect RuntimeConfig from environment
    const runtimeConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    };

    // Merge AgentDefinition (business) + RuntimeConfig (infrastructure)
    const driverConfig = {
      ...runtimeConfig,
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
 * - ANTHROPIC_API_KEY (required)
 * - ANTHROPIC_BASE_URL (optional)
 * - CLAUDE_MODEL (optional, defaults to claude-sonnet-4-20250514)
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
