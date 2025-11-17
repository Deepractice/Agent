/**
 * defineConfig
 *
 * Framework helper for defining configuration schemas with type safety and validation.
 *
 * @example
 * ```typescript
 * const MyConfig = defineConfig({
 *   driver: {
 *     apiKey: { type: "string", required: true },
 *     model: { type: "string", default: "claude-3-5-sonnet" },
 *     maxTokens: { type: "number", default: 1000 },
 *   },
 *   reactors: [{
 *     logLevel: { type: "enum", values: ["debug", "info", "warn"], default: "info" },
 *   }]
 * });
 *
 * // Type-safe config creation
 * const config = MyConfig.create({
 *   driver: { apiKey: "xxx" },  // model and maxTokens use defaults
 *   reactors: [{ logLevel: "debug" }]
 * });
 * ```
 */

/**
 * Field types
 */
export type FieldType = "string" | "number" | "boolean" | "enum" | "object" | "array";

/**
 * Field definition
 */
export interface FieldDefinition<T = any> {
  /**
   * Field type
   */
  type: FieldType;

  /**
   * Whether field is required
   * @default false
   */
  required?: boolean;

  /**
   * Default value
   */
  default?: T;

  /**
   * Enum values (for type: "enum")
   */
  values?: readonly T[];

  /**
   * Description
   */
  description?: string;

  /**
   * Validation function
   */
  validate?: (value: T) => boolean | string;
}

/**
 * Config schema
 */
export interface ConfigSchema {
  [key: string]: FieldDefinition | ConfigSchema;
}

/**
 * Infer TypeScript type from config schema
 */
export type InferConfig<T extends ConfigSchema> = {
  [K in keyof T]: T[K] extends FieldDefinition<infer V>
    ? T[K]["required"] extends true
      ? V
      : V | undefined
    : T[K] extends ConfigSchema
    ? InferConfig<T[K]>
    : never;
};

/**
 * Defined config factory
 */
export interface DefinedConfig<TSchema extends ConfigSchema> {
  /**
   * Config schema
   */
  schema: TSchema;

  /**
   * Create config instance with validation
   */
  create: (input: Partial<InferConfig<TSchema>>) => InferConfig<TSchema>;

  /**
   * Validate config
   */
  validate: (config: any) => { valid: boolean; errors: string[] };
}

/**
 * Validation error
 */
class ConfigValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

/**
 * Validate a single field
 */
function validateField(
  path: string,
  value: any,
  field: FieldDefinition
): string[] {
  const errors: string[] = [];

  // Check required (also reject empty strings for string fields)
  if (field.required) {
    if (value === undefined || value === null) {
      errors.push(`${path}: Required field is missing`);
      return errors;
    }
    // For string fields, also reject empty strings
    if (field.type === "string" && value === "") {
      errors.push(`${path}: Required field cannot be empty`);
      return errors;
    }
  }

  // Skip validation if optional and undefined
  if (value === undefined || value === null) {
    return errors;
  }

  // Type validation
  switch (field.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push(`${path}: Expected string, got ${typeof value}`);
      }
      break;

    case "number":
      if (typeof value !== "number") {
        errors.push(`${path}: Expected number, got ${typeof value}`);
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        errors.push(`${path}: Expected boolean, got ${typeof value}`);
      }
      break;

    case "enum":
      if (!field.values || !field.values.includes(value)) {
        errors.push(
          `${path}: Expected one of [${field.values?.join(", ")}], got ${value}`
        );
      }
      break;

    case "object":
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push(`${path}: Expected object, got ${typeof value}`);
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        errors.push(`${path}: Expected array, got ${typeof value}`);
      }
      break;
  }

  // Custom validation
  if (field.validate) {
    const result = field.validate(value);
    if (result !== true) {
      errors.push(
        typeof result === "string" ? `${path}: ${result}` : `${path}: Validation failed`
      );
    }
  }

  return errors;
}

/**
 * Validate config against schema
 */
function validateConfig(
  config: any,
  schema: ConfigSchema,
  path = ""
): string[] {
  const errors: string[] = [];

  for (const [key, fieldOrSchema] of Object.entries(schema)) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = config[key];

    if ("type" in fieldOrSchema) {
      // It's a field definition
      errors.push(...validateField(currentPath, value, fieldOrSchema as FieldDefinition));
    } else {
      // It's a nested schema
      if (value !== undefined && value !== null) {
        errors.push(...validateConfig(value, fieldOrSchema as ConfigSchema, currentPath));
      }
    }
  }

  return errors;
}

/**
 * Apply defaults to config
 */
function applyDefaults(
  config: any,
  schema: ConfigSchema
): any {
  const result: any = { ...config };

  for (const [key, fieldOrSchema] of Object.entries(schema)) {
    if ("type" in fieldOrSchema) {
      // It's a field definition
      const field = fieldOrSchema as FieldDefinition;
      if (result[key] === undefined && field.default !== undefined) {
        result[key] = field.default;
      }
    } else {
      // It's a nested schema
      if (result[key] === undefined) {
        result[key] = {};
      }
      result[key] = applyDefaults(result[key], fieldOrSchema as ConfigSchema);
    }
  }

  return result;
}

/**
 * Define a configuration schema
 *
 * @param schema - Config schema definition
 * @returns Defined config factory
 *
 * @example
 * ```typescript
 * const MyConfig = defineConfig({
 *   apiKey: { type: "string", required: true },
 *   model: { type: "string", default: "claude-3-5-sonnet" },
 *   temperature: {
 *     type: "number",
 *     default: 0.7,
 *     validate: (v) => v >= 0 && v <= 1 || "Must be between 0 and 1"
 *   }
 * });
 *
 * const config = MyConfig.create({ apiKey: "xxx" });
 * // config.model === "claude-3-5-sonnet" (default)
 * // config.temperature === 0.7 (default)
 * ```
 */
export function defineConfig<TSchema extends ConfigSchema>(
  schema: TSchema
): DefinedConfig<TSchema> {
  return {
    schema,

    create: (input: Partial<InferConfig<TSchema>>) => {
      // Apply defaults
      const config = applyDefaults(input, schema);

      // Validate
      const errors = validateConfig(config, schema);

      if (errors.length > 0) {
        throw new ConfigValidationError(
          `Config validation failed:\n${errors.join("\n")}`,
          errors
        );
      }

      return config as InferConfig<TSchema>;
    },

    validate: (config: any) => {
      const errors = validateConfig(config, schema);
      return {
        valid: errors.length === 0,
        errors,
      };
    },
  };
}

/**
 * Export config validation error
 */
export { ConfigValidationError };
