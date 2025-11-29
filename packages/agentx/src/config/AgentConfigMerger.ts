/**
 * AgentConfigMerger - Merge configuration from multiple scopes
 *
 * Handles the three-tier configuration merging:
 * 1. Container-level config (lowest priority)
 * 2. Definition-level config (from defineAgent)
 * 3. Instance-level config (highest priority)
 *
 * Priority: instance > definition > container
 */

import type { AgentDefinition } from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/AgentConfigMerger");

/**
 * Merge configuration from all scopes
 *
 * @param definition - Agent definition (may contain definition-level config)
 * @param instanceConfig - Instance-level config provided at creation time
 * @param containerConfig - Container-level config (env vars, cwd, etc.)
 * @returns Merged configuration with proper priority
 */
export function mergeAgentConfig<TConfig extends Record<string, unknown>>(
  definition: AgentDefinition,
  instanceConfig: Record<string, unknown>,
  containerConfig: Record<string, unknown> = {}
): TConfig {
  // 1. Start with container-level config (lowest priority)
  const merged: Record<string, unknown> = { ...containerConfig };

  // 2. Layer on definition-level config (from defineAgent)
  if (definition.config) {
    Object.assign(merged, definition.config);
    logger.debug("Applied definition-level config", {
      definitionName: definition.name,
      keys: Object.keys(definition.config),
    });
  }

  // 3. Layer on instance-level config (highest priority)
  Object.assign(merged, instanceConfig);
  logger.debug("Applied instance-level config", {
    definitionName: definition.name,
    keys: Object.keys(instanceConfig),
  });

  logger.debug("Config merge complete", {
    definitionName: definition.name,
    finalKeys: Object.keys(merged),
  });

  return merged as TConfig;
}

/**
 * AgentConfigMerger class (stateful version if needed)
 *
 * Provides stateful config merging with container-level defaults.
 */
export class AgentConfigMerger {
  constructor(private readonly containerConfig: Record<string, unknown> = {}) {}

  /**
   * Merge config for a specific agent definition
   */
  merge<TConfig extends Record<string, unknown>>(
    definition: AgentDefinition,
    instanceConfig: Record<string, unknown>
  ): TConfig {
    return mergeAgentConfig<TConfig>(definition, instanceConfig, this.containerConfig);
  }

  /**
   * Update container-level config
   */
  setContainerConfig(config: Record<string, unknown>): void {
    Object.assign(this.containerConfig, config);
  }
}
