/**
 * DefinitionManager - Agent definition registry
 *
 * Part of Docker-style layered architecture:
 * Definition → [auto] → MetaImage → Session → Agent
 *
 * DefinitionManager provides:
 * - Registration of agent definitions
 * - Auto-creation of MetaImage on registration
 * - Lookup by name
 *
 * @example
 * ```typescript
 * // Register definition (auto-creates MetaImage)
 * agentx.definitions.register(TranslatorDef);
 *
 * // Get definition
 * const def = agentx.definitions.get("Translator");
 *
 * // List all definitions
 * const defs = agentx.definitions.list();
 * ```
 */

import type { AgentDefinition } from "~/environment/definition";

/**
 * DefinitionManager - Registry for agent definitions
 */
export interface DefinitionManager {
  /**
   * Register an agent definition
   *
   * This also auto-creates a MetaImage for the definition.
   *
   * @param definition - Agent definition to register
   * @throws Error if definition with same name already exists
   *
   * @example
   * ```typescript
   * const TranslatorDef = {
   *   name: "Translator",
   *   systemPrompt: "You are a professional translator"
   * };
   * agentx.definitions.register(TranslatorDef);
   * ```
   */
  register(definition: AgentDefinition): void;

  /**
   * Get a definition by name
   *
   * @param name - Definition name
   * @returns Definition or undefined if not found
   */
  get(name: string): AgentDefinition | undefined;

  /**
   * List all registered definitions
   *
   * @returns Array of all definitions
   */
  list(): AgentDefinition[];

  /**
   * Check if a definition exists
   *
   * @param name - Definition name
   * @returns true if exists
   */
  has(name: string): boolean;

  /**
   * Unregister a definition
   *
   * Note: This also removes the associated MetaImage.
   *
   * @param name - Definition name
   * @returns true if removed, false if not found
   */
  unregister(name: string): boolean;
}
