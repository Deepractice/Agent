/**
 * Configuration schema
 *
 * A map of field names to field definitions.
 * Drivers export their schema to declare what configuration they accept.
 */

import type { ConfigFieldDefinition } from "./ConfigField";

/**
 * Configuration schema type
 */
export type ConfigSchema = Record<string, ConfigFieldDefinition>;

/**
 * Validate config against schema
 *
 * @param schema - Configuration schema
 * @param config - Configuration object to validate
 * @returns Validation result with errors
 */
export function validateConfig(
  schema: ConfigSchema,
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    const value = config[key];

    // Check required
    if (field.required && value === undefined) {
      errors.push(`${key}: Required field is missing`);
      continue;
    }

    // Skip if optional and not provided
    if (value === undefined) {
      continue;
    }

    // Type check
    const expectedType = field.type;
    const actualType = Array.isArray(value) ? "array" : typeof value;

    if (actualType !== expectedType) {
      errors.push(`${key}: Expected ${expectedType}, got ${actualType}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Apply defaults from schema to config
 *
 * @param schema - Configuration schema
 * @param config - Configuration object
 * @returns Config with defaults applied
 */
export function applyDefaults<T extends Record<string, unknown>>(
  schema: ConfigSchema,
  config: T
): T {
  const result: Record<string, unknown> = { ...config };

  for (const [key, field] of Object.entries(schema)) {
    if (result[key] === undefined && field.default !== undefined) {
      result[key] = field.default;
    }
  }

  return result as T;
}

/**
 * Process config: apply defaults and validate
 *
 * @param schema - Configuration schema
 * @param config - Configuration object
 * @returns Processed config
 * @throws {ConfigValidationError} If validation fails
 */
export function processConfig<T extends Record<string, unknown>>(
  schema: ConfigSchema,
  config: T
): T {
  // Apply defaults first
  const withDefaults = applyDefaults(schema, config);

  // Then validate
  const { valid, errors } = validateConfig(schema, withDefaults);

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
    public readonly errors: string[]
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}
