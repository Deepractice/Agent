/**
 * createAgent - Facade API for creating Agent instances
 *
 * This is the primary API for creating agents in the AgentX ecosystem.
 * It uses mixin pattern to combine Agent data (from agentx-types) with
 * AgentService methods (from core).
 *
 * Usage:
 * ```typescript
 * import { createAgent } from "@deepractice-ai/agentx-core";
 * import { ClaudeDriver } from "@deepractice-ai/agentx-node";
 *
 * const agent = createAgent(
 *   "my-assistant",
 *   new ClaudeDriver(config),
 *   {
 *     name: "Code Assistant",
 *     description: "Helps with coding tasks",
 *     reactors: [new LoggerReactor()],
 *   }
 * );
 *
 * await agent.initialize();
 * await agent.send("Hello!");
 * ```
 */

import type { Agent } from "@deepractice-ai/agentx-types";
import type { AgentService } from "~/interfaces/AgentService";
import type { AgentDriver } from "~/interfaces/AgentDriver";
import { AgentServiceImpl } from "~/core/agent/AgentServiceImpl";
import type { EngineConfig } from "~/core/agent/AgentEngine";

/**
 * AgentInstance = Agent data + AgentService methods
 *
 * External usage is flat and intuitive:
 * - agent.id → from Agent data
 * - agent.name → from Agent data
 * - agent.send() → from AgentService
 * - agent.react() → from AgentService
 * - agent.sendMessage() → from AgentDriver (via AgentService extends AgentDriver)
 * - agent.abort() → from AgentDriver (via AgentService extends AgentDriver)
 *
 * **Agent-as-Driver Pattern**:
 * Since AgentService extends AgentDriver, any AgentInstance can be used as a Driver
 * in nested Agent compositions. This is explicitly defined at the interface level.
 */
export type AgentInstance = Agent & AgentService;

/**
 * Options for createAgent
 */
export interface CreateAgentOptions {
  /**
   * Reactors to attach to this agent
   */
  reactors?: any[];

  /**
   * Agent name (defaults to "Agent-{id}")
   */
  name?: string;

  /**
   * Agent description
   */
  description?: string;

  /**
   * Agent tags for categorization
   */
  tags?: string[];

  /**
   * Agent version
   */
  version?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Create an Agent instance
 *
 * This is the facade API that:
 * 1. Assembles Agent data from parameters
 * 2. Creates AgentService with the data
 * 3. Mixes Agent data into AgentService instance
 * 4. Returns a unified instance with both data and methods
 *
 * @param id - Unique agent identifier
 * @param driver - Platform-specific driver (e.g., ClaudeDriver, WebSocketDriver)
 * @param options - Optional configuration
 * @returns AgentInstance with both data and methods
 *
 * @example Basic usage
 * ```typescript
 * const agent = createAgent("assistant-001", driver);
 * ```
 *
 * @example With full options
 * ```typescript
 * const agent = createAgent("assistant-001", driver, {
 *   name: "Code Assistant",
 *   description: "Helps with coding tasks",
 *   tags: ["coding", "assistant"],
 *   reactors: [new MyCustomReactor()],
 * });
 * ```
 *
 * @example Agent-as-Driver pattern (nested composition)
 * ```typescript
 * const innerAgent = createAgent("inner", innerDriver);
 * await innerAgent.initialize();
 *
 * // Use innerAgent as a Driver for outerAgent
 * const outerAgent = createAgent("outer", innerAgent, {
 *   reactors: [new MonitoringReactor()],
 * });
 * await outerAgent.initialize();
 *
 * // Request flows through both agents
 * await outerAgent.send("Hello!");
 * ```
 */
export function createAgent(
  id: string,
  driver: AgentDriver,
  options?: CreateAgentOptions
): AgentInstance {
  // 1. Assemble Agent data internally
  const agentData: Agent = {
    id,
    name: options?.name ?? `Agent-${id}`,
    description: options?.description,
    createdAt: Date.now(),
    version: options?.version,
    tags: options?.tags,
    ...(options?.metadata || {}),
  };

  // 2. Prepare EngineConfig
  const engineConfig: EngineConfig | undefined = options?.reactors
    ? { reactors: options.reactors }
    : undefined;

  // 3. Create AgentServiceImpl
  const service = new AgentServiceImpl(agentData, driver, engineConfig);

  // 4. Mixin: Combine Agent data + AgentService methods
  // This allows external code to access both:
  // - agent.id, agent.name (from Agent data)
  // - agent.send(), agent.react() (from AgentService methods)
  return Object.assign(service, agentData) as AgentInstance;
}
