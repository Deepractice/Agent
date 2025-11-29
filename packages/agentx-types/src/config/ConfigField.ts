/**
 * Configuration field scope
 *
 * Determines where the field can be set:
 * - `container`: Provided by AgentX container/runtime (e.g., cwd, env, abortController)
 * - `definition`: Set in defineAgent() (agent template level)
 * - `instance`: Set in create() (agent instance level)
 *
 * Priority: instance > definition > container
 */
export type ConfigScope = "container" | "definition" | "instance";

/**
 * Field type
 */
export type FieldType = "string" | "number" | "boolean" | "object" | "array";

/**
 * Configuration field definition
 *
 * Defines metadata for a single configuration field.
 */
export interface ConfigFieldDefinition {
  /**
   * Field type
   */
  type: FieldType;

  /**
   * Scopes: where this field can be provided
   *
   * Multiple scopes can be specified. Priority is always: instance > definition > container
   *
   * - `container`: Provided by AgentX container/runtime (automatically injected)
   * - `definition`: Set in defineAgent() (shared by all instances)
   * - `instance`: Set in create() (per-instance)
   *
   * @example
   * ```typescript
   * // Only instance can provide (e.g., apiKey)
   * scopes: ["instance"]
   *
   * // Definition provides default, instance can override
   * scopes: ["instance", "definition"]
   *
   * // Only container provides (e.g., cwd, abortController)
   * scopes: ["container"]
   * ```
   */
  scopes: ConfigScope[];

  /**
   * Whether field is required
   */
  required?: boolean;

  /**
   * Default value
   */
  default?: unknown;

  /**
   * Field description
   */
  description?: string;

  /**
   * Whether this field contains sensitive data
   *
   * Sensitive fields should be masked in logs and UI.
   */
  sensitive?: boolean;
}
