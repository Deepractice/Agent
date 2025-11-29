/**
 * Configuration field scope
 *
 * Determines where the field can be set:
 * - `definition`: Set in defineAgent() (agent template level)
 * - `instance`: Set in create() (agent instance level)
 */
export type ConfigScope = "definition" | "instance";

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
   * Scope: where this field can be set
   *
   * - `definition`: Set in defineAgent() (shared by all instances)
   * - `instance`: Set in create() (per-instance)
   */
  scope: ConfigScope;

  /**
   * Whether this definition-scope field can be overridden at instance creation
   *
   * Only applicable when scope is "definition".
   *
   * @example
   * ```typescript
   * model: {
   *   scope: "definition",
   *   overridable: true  // Can override in create()
   * }
   *
   * allowedTools: {
   *   scope: "definition",
   *   overridable: false  // Cannot override (security policy)
   * }
   * ```
   *
   * @default true
   */
  overridable?: boolean;

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
   * Environment variable name to load from
   *
   * @example "ANTHROPIC_API_KEY"
   */
  fromEnv?: string;

  /**
   * Whether this field contains sensitive data
   *
   * Sensitive fields should be masked in logs and UI.
   */
  sensitive?: boolean;
}
