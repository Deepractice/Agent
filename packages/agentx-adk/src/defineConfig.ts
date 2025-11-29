/**
 * defineConfig implementation
 *
 * Creates a reusable configuration definition with validation,
 * defaults, and documentation generation.
 */

import type {
  ConfigSchema,
  ConfigFieldDefinition,
  ConfigDefinition,
} from "@deepractice-ai/agentx-types";
import { validateConfig, applyDefaults } from "@deepractice-ai/agentx-types";

/**
 * defineConfig - Create a configuration definition
 *
 * @param schema - Configuration schema
 * @returns Configuration definition with utilities
 */
export function defineConfig<S extends ConfigSchema>(schema: S): ConfigDefinition<S> {
  return {
    schema,

    validate(config: Record<string, unknown>): boolean {
      const result = validateConfig(schema, config);
      return result.valid;
    },

    applyDefaults<T extends Record<string, unknown>>(config: T): T {
      return applyDefaults(schema, config);
    },

    toMarkdown(): string {
      return generateMarkdownDocs(schema);
    },

    toJSONSchema(): object {
      return generateJSONSchema(schema);
    },
  };
}

/**
 * Generate Markdown documentation from schema
 */
function generateMarkdownDocs(schema: ConfigSchema): string {
  const lines: string[] = [];

  lines.push("# Configuration");
  lines.push("");

  // Group by primary scope (first scope in array)
  const containerFields: [string, ConfigFieldDefinition][] = [];
  const definitionFields: [string, ConfigFieldDefinition][] = [];
  const instanceFields: [string, ConfigFieldDefinition][] = [];

  for (const [key, field] of Object.entries(schema)) {
    const primaryScope = field.scopes[0];
    if (primaryScope === "container") {
      containerFields.push([key, field]);
    } else if (primaryScope === "definition") {
      definitionFields.push([key, field]);
    } else {
      instanceFields.push([key, field]);
    }
  }

  // Container scope
  if (containerFields.length > 0) {
    lines.push("## Container Configuration");
    lines.push("");
    lines.push("Provided by AgentX container/runtime (automatically injected):");
    lines.push("");

    for (const [key, field] of containerFields) {
      lines.push(`### \`${key}\``);
      lines.push("");
      if (field.description) {
        lines.push(field.description);
        lines.push("");
      }
      lines.push(`- **Type**: \`${field.type}\``);
      lines.push(`- **Scopes**: ${field.scopes.join(", ")}`);
      if (field.default !== undefined) {
        lines.push(`- **Default**: \`${JSON.stringify(field.default)}\``);
      }
      lines.push("");
    }
  }

  // Definition scope
  if (definitionFields.length > 0) {
    lines.push("## Definition-level Configuration");
    lines.push("");
    lines.push("Set in `defineAgent()`:");
    lines.push("");

    for (const [key, field] of definitionFields) {
      lines.push(`### \`${key}\``);
      lines.push("");
      if (field.description) {
        lines.push(field.description);
        lines.push("");
      }
      lines.push(`- **Type**: \`${field.type}\``);
      lines.push(`- **Scopes**: ${field.scopes.join(", ")}`);
      lines.push(`- **Required**: ${field.required ? "Yes" : "No"}`);
      if (field.scopes.includes("instance")) {
        lines.push("- **Can override at instance**: Yes");
      }
      if (field.default !== undefined) {
        lines.push(`- **Default**: \`${JSON.stringify(field.default)}\``);
      }
      lines.push("");
    }
  }

  // Instance scope
  if (instanceFields.length > 0) {
    lines.push("## Instance-level Configuration");
    lines.push("");
    lines.push("Set in `agentx.agents.create()`:");
    lines.push("");

    for (const [key, field] of instanceFields) {
      lines.push(`### \`${key}\``);
      lines.push("");
      if (field.description) {
        lines.push(field.description);
        lines.push("");
      }
      lines.push(`- **Type**: \`${field.type}\``);
      lines.push(`- **Scopes**: ${field.scopes.join(", ")}`);
      lines.push(`- **Required**: ${field.required ? "Yes" : "No"}`);
      if (field.default !== undefined) {
        lines.push(`- **Default**: \`${JSON.stringify(field.default)}\``);
      }
      if (field.sensitive) {
        lines.push("- **Sensitive**: Yes (should not be logged)");
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Generate JSON Schema from ConfigSchema
 */
function generateJSONSchema(schema: ConfigSchema): object {
  const properties: Record<string, object> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    const property: Record<string, unknown> = {
      type: mapFieldTypeToJSONType(field.type),
    };

    if (field.description) {
      property.description = field.description;
    }

    if (field.default !== undefined) {
      property.default = field.default;
    }

    properties[key] = property;

    if (field.required) {
      required.push(key);
    }
  }

  const jsonSchema: Record<string, unknown> = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    jsonSchema.required = required;
  }

  return jsonSchema;
}

/**
 * Map ConfigField type to JSON Schema type
 */
function mapFieldTypeToJSONType(type: ConfigFieldDefinition["type"]): string | string[] {
  switch (type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}
