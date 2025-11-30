/**
 * Type inference utilities for configuration schema
 *
 * Provides TypeScript type utilities to infer config types from schema.
 */

import type { ConfigSchema, ConfigFieldDefinition, FieldType, ConfigScope } from "./index";

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
 * Check if a scope array includes a specific scope
 */
type HasScope<
  Scopes extends readonly ConfigScope[],
  Scope extends ConfigScope,
> = Scope extends Scopes[number] ? true : false;

/**
 * Pick fields by scope
 *
 * Extracts fields that have the given scope in their scopes array.
 *
 * @example
 * ```typescript
 * type DefinitionFields = PickByScope<MySchema, "definition">;
 * type InstanceFields = PickByScope<MySchema, "instance">;
 * ```
 */
export type PickByScope<S extends ConfigSchema, Scope extends ConfigScope> = {
  [K in keyof S as HasScope<S[K]["scopes"], Scope> extends true ? K : never]: InferFieldType<S[K]>;
};

/**
 * Extract required fields for a given scope
 *
 * @example
 * ```typescript
 * type RequiredInstanceFields = RequiredFields<MySchema, "instance">;
 * ```
 */
export type RequiredFields<S extends ConfigSchema, Scope extends ConfigScope> = {
  [K in keyof S as HasScope<S[K]["scopes"], Scope> extends true
    ? S[K]["required"] extends true
      ? K
      : never
    : never]: InferFieldType<S[K]>;
};

/**
 * Extract optional fields for a given scope
 */
export type OptionalFields<S extends ConfigSchema, Scope extends ConfigScope> = {
  [K in keyof S as HasScope<S[K]["scopes"], Scope> extends true
    ? S[K]["required"] extends true
      ? never
      : K
    : never]?: InferFieldType<S[K]>;
};

/**
 * Extract instance-overridable definition fields
 *
 * These are definition-scope fields that also have instance scope (can be overridden).
 */
export type InstanceOverridableDefinitionFields<S extends ConfigSchema> = {
  [K in keyof S as HasScope<S[K]["scopes"], "definition"> extends true
    ? HasScope<S[K]["scopes"], "instance"> extends true
      ? K
      : never
    : never]?: InferFieldType<S[K]>;
};

/**
 * Definition config type
 *
 * Fields that can be set in defineAgent().
 * Includes all fields with "definition" in their scopes.
 */
export type DefinitionConfig<S extends ConfigSchema> = RequiredFields<S, "definition"> &
  OptionalFields<S, "definition">;

/**
 * Instance config type
 *
 * Fields that can be set in create().
 * Includes:
 * - All instance-scope fields (required + optional)
 * - Definition fields that also have instance scope (can override)
 */
export type InstanceConfig<S extends ConfigSchema> = RequiredFields<S, "instance"> &
  OptionalFields<S, "instance"> &
  InstanceOverridableDefinitionFields<S>;

/**
 * Container config type
 *
 * Fields provided by the AgentX container/runtime.
 * Includes all fields with "container" in their scopes.
 */
export type ContainerConfig<S extends ConfigSchema> = RequiredFields<S, "container"> &
  OptionalFields<S, "container">;

/**
 * Full config type (merged container + definition + instance)
 *
 * The final config object that will be passed to the driver.
 * Priority: instance > definition > container
 */
export type FullConfig<S extends ConfigSchema> = RequiredFields<S, "container"> &
  OptionalFields<S, "container"> &
  RequiredFields<S, "definition"> &
  OptionalFields<S, "definition"> &
  RequiredFields<S, "instance"> &
  OptionalFields<S, "instance">;
