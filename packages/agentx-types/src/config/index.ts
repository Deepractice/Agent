/**
 * Configuration system
 *
 * Provides type-safe configuration schema for drivers and agents.
 */

// Field definition
export type { ConfigScope, FieldType, ConfigFieldDefinition } from "./ConfigField";

// Schema
export type { ConfigSchema } from "./ConfigSchema";
export {
  validateConfig,
  applyDefaults,
  processConfig,
  ConfigValidationError,
} from "./ConfigSchema";

// Type inference
export type {
  PickByScope,
  RequiredFields,
  OptionalFields,
  OverridableDefinitionFields,
  NonOverridableDefinitionFields,
  DefinitionConfig,
  InstanceConfig,
  FullConfig,
} from "./ConfigInference";
