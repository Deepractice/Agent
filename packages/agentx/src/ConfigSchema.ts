/**
 * ConfigSchema - Type-safe configuration schema
 *
 * Defines the configuration schema for an Agent.
 * Supports type inference so user gets type-safe config.
 *
 * @example
 * ```typescript
 * const schema = {
 *   apiKey: { type: "string", required: true },
 *   model: { type: "string", default: "claude-sonnet-4-20250514" },
 *   temperature: { type: "number", default: 0.7 },
 * } as const satisfies ConfigSchema;
 *
 * // Type is inferred as:
 * // { apiKey: string; model?: string; temperature?: number }
 * type Config = InferConfig<typeof schema>;
 * ```
 */

/**
 * Field types
 */
export type FieldType = "string" | "number" | "boolean";

/**
 * Field definition
 */
export interface FieldDefinition<T extends FieldType = FieldType> {
  /**
   * Field type
   */
  type: T;

  /**
   * Whether field is required (default: false)
   */
  required?: boolean;

  /**
   * Default value
   */
  default?: FieldTypeMap[T];

  /**
   * Description
   */
  description?: string;
}

/**
 * Map field type to TypeScript type
 */
interface FieldTypeMap {
  string: string;
  number: number;
  boolean: boolean;
}

/**
 * Config schema - flat object of field definitions
 */
export type ConfigSchema = {
  [key: string]: FieldDefinition;
};

/**
 * Infer TypeScript type from field definition
 */
type InferFieldType<F extends FieldDefinition> = F["type"] extends keyof FieldTypeMap
  ? FieldTypeMap[F["type"]]
  : never;

/**
 * Infer TypeScript type from config schema
 *
 * - Required fields (required: true) are non-optional
 * - Optional fields (required: false or undefined) are optional
 * - Fields with default are optional in input but present in output
 */
export type InferConfig<T extends ConfigSchema> = {
  [K in keyof T as T[K]["required"] extends true ? K : never]: InferFieldType<T[K]>;
} & {
  [K in keyof T as T[K]["required"] extends true ? never : K]?: InferFieldType<T[K]>;
};

/**
 * Validate config against schema
 */
export function validateConfig<T extends ConfigSchema>(
  schema: T,
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    const value = config[key];

    // Check required
    if (field.required && (value === undefined || value === null)) {
      errors.push(`${key}: Required field is missing`);
      continue;
    }

    // Skip if optional and not provided
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    const expectedType = field.type;
    const actualType = typeof value;

    if (actualType !== expectedType) {
      errors.push(`${key}: Expected ${expectedType}, got ${actualType}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Apply defaults to config
 */
export function applyDefaults<T extends ConfigSchema>(
  schema: T,
  config: Record<string, unknown>
): InferConfig<T> {
  const result: Record<string, unknown> = { ...config };

  for (const [key, field] of Object.entries(schema)) {
    if (result[key] === undefined && field.default !== undefined) {
      result[key] = field.default;
    }
  }

  return result as InferConfig<T>;
}

/**
 * Validate and apply defaults
 */
export function processConfig<T extends ConfigSchema>(
  schema: T,
  config: Record<string, unknown>
): InferConfig<T> {
  // Apply defaults first
  const withDefaults = applyDefaults(schema, config);

  // Then validate
  const { valid, errors } = validateConfig(schema, withDefaults as Record<string, unknown>);

  if (!valid) {
    throw new ConfigValidationError(`Config validation failed:\n${errors.join("\n")}`, errors);
  }

  return withDefaults;
}

/**
 * Config validation error
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}
