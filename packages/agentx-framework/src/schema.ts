/**
 * Config Schema System
 *
 * Simple schema definition and validation for agent configuration.
 * TypeScript-first approach with runtime validation.
 */

/**
 * Schema field types
 */
export type SchemaFieldType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor;

/**
 * Schema field definition
 */
export interface SchemaField<T = any> {
  type: SchemaFieldType;
  required?: boolean;
  default?: T;
  optional?: boolean;
}

/**
 * Config schema definition
 */
export type ConfigSchema<T = any> = {
  [K in keyof T]: SchemaField<T[K]>;
};

/**
 * Infer config type from schema
 */
export type InferConfig<TSchema extends ConfigSchema> = {
  [K in keyof TSchema]: TSchema[K] extends SchemaField<infer U>
    ? TSchema[K]["required"] extends true
      ? U
      : TSchema[K]["optional"] extends true
        ? U | undefined
        : U
    : never;
};

/**
 * Validate and merge config with defaults
 */
export function validateAndMergeConfig<TSchema extends ConfigSchema>(
  schema: TSchema,
  userConfig: Partial<InferConfig<TSchema>>
): InferConfig<TSchema> {
  const result: any = {};

  for (const key in schema) {
    const field = schema[key];
    const value = userConfig[key as keyof typeof userConfig];

    // Check required fields
    if (field.required && value === undefined) {
      throw new Error(`Missing required config field: ${String(key)}`);
    }

    // Use user value, default value, or undefined
    if (value !== undefined) {
      // Validate type
      if (!validateType(value, field.type)) {
        throw new Error(
          `Invalid type for config field "${String(key)}": expected ${field.type.name}, got ${typeof value}`
        );
      }
      result[key] = value;
    } else if (field.default !== undefined) {
      result[key] = field.default;
    } else if (field.optional) {
      result[key] = undefined;
    }
  }

  return result;
}

/**
 * Validate value type
 */
function validateType(value: any, type: SchemaFieldType): boolean {
  switch (type) {
    case String:
      return typeof value === "string";
    case Number:
      return typeof value === "number";
    case Boolean:
      return typeof value === "boolean";
    case Object:
      return typeof value === "object" && value !== null;
    default:
      return true;
  }
}
