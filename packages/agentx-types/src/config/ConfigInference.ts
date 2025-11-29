/**
 * Type inference utilities for configuration schema
 *
 * Provides TypeScript type utilities to infer config types from schema.
 */

import type { ConfigSchema, ConfigFieldDefinition, FieldType } from "./index";

/**
 * Infer TypeScript type from field type
 */
type InferFieldType<F extends ConfigFieldDefinition> = F["type"] extends "string"
  ? string
  : F["type"] extends "number"
    ? number
    : F["type"] extends "boolean"
      ? boolean
      : F["type"] extends "array"
        ? unknown[]
        : F["type"] extends "object"
          ? Record<string, unknown>
          : unknown;

/**
 * Pick fields by scope
 *
 * Extracts fields that match the given scope.
 *
 * @example
 * ```typescript
 * type DefinitionFields = PickByScope<MySchema, "definition">;
 * type InstanceFields = PickByScope<MySchema, "instance">;
 * ```
 */
export type PickByScope<S extends ConfigSchema, Scope extends "definition" | "instance"> = {
  [K in keyof S as S[K]["scope"] extends Scope ? K : never]: InferFieldType<S[K]>;
};

/**
 * Extract required fields for a given scope
 *
 * @example
 * ```typescript
 * type RequiredInstanceFields = RequiredFields<MySchema, "instance">;
 * ```
 */
export type RequiredFields<S extends ConfigSchema, Scope extends "definition" | "instance"> = {
  [K in keyof S as S[K]["scope"] extends Scope
    ? S[K]["required"] extends true
      ? K
      : never
    : never]: InferFieldType<S[K]>;
};

/**
 * Extract optional fields for a given scope
 */
export type OptionalFields<S extends ConfigSchema, Scope extends "definition" | "instance"> = {
  [K in keyof S as S[K]["scope"] extends Scope
    ? S[K]["required"] extends true
      ? never
      : K
    : never]?: InferFieldType<S[K]>;
};

/**
 * Extract overridable definition fields
 *
 * These are definition-scope fields that can be overridden at instance creation.
 */
export type OverridableDefinitionFields<S extends ConfigSchema> = {
  [K in keyof S as S[K]["scope"] extends "definition"
    ? S[K]["overridable"] extends false
      ? never
      : K
    : never]?: InferFieldType<S[K]>;
};

/**
 * Extract non-overridable definition fields
 *
 * These are definition-scope fields that cannot be overridden.
 */
export type NonOverridableDefinitionFields<S extends ConfigSchema> = {
  [K in keyof S as S[K]["scope"] extends "definition"
    ? S[K]["overridable"] extends false
      ? K
      : never
    : never]: InferFieldType<S[K]>;
};

/**
 * Definition config type
 *
 * Fields that can be set in defineAgent().
 * Only includes definition-scope fields.
 */
export type DefinitionConfig<S extends ConfigSchema> = RequiredFields<S, "definition"> &
  OptionalFields<S, "definition">;

/**
 * Instance config type
 *
 * Fields that can be set in create().
 * Includes:
 * - All instance-scope fields (required + optional)
 * - Overridable definition-scope fields (optional)
 */
export type InstanceConfig<S extends ConfigSchema> = RequiredFields<S, "instance"> &
  OptionalFields<S, "instance"> &
  OverridableDefinitionFields<S>;

/**
 * Full config type (merged definition + instance)
 *
 * The final config object that will be passed to the driver.
 */
export type FullConfig<S extends ConfigSchema> = RequiredFields<S, "definition"> &
  OptionalFields<S, "definition"> &
  RequiredFields<S, "instance"> &
  OptionalFields<S, "instance">;
