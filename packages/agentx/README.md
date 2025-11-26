# @deepractice-ai/agentx-framework

**AgentX Framework** - Composition tools and type-safe configuration for AgentX.

## Overview

Framework provides:
- `defineAgent()` - Composition tool for creating AgentDefinition
- `ConfigSchema` - Type-safe configuration schema with inference

Framework does NOT dictate what config an agent should have. Developers define their own config through `configSchema`.

## Installation

```bash
pnpm add @deepractice-ai/agentx-framework
```

## Quick Start

### Define an Agent

```typescript
import { defineAgent } from "@deepractice-ai/agentx-framework";

// Server Agent - needs apiKey and systemPrompt
const ClaudeServerAgent = defineAgent({
  name: "ClaudeServer",
  driver: claudeDriver,
  configSchema: {
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-sonnet-4-20250514" },
    systemPrompt: { type: "string" },
    temperature: { type: "number", default: 0.7 },
  },
});

// Browser Agent - only needs serverUrl (secure)
const BrowserAgent = defineAgent({
  name: "Browser",
  driver: sseDriver,
  configSchema: {
    serverUrl: { type: "string", required: true },
    sessionId: { type: "string" },
  },
});
```

### Use with Core

```typescript
import { createAgent } from "@deepractice-ai/agentx-core";

// Config is type-checked against schema
const agent = createAgent(ClaudeServerAgent, {
  apiKey: "sk-xxx",
  model: "claude-sonnet-4-20250514",
  systemPrompt: "You are a helpful assistant.",
});
```

## API

### defineAgent

Creates an AgentDefinition with optional config schema:

```typescript
function defineAgent<TConfigSchema extends ConfigSchema>(
  options: DefineAgentOptions<TConfigSchema>
): DefinedAgent<TConfigSchema>;

interface DefineAgentOptions<TConfigSchema> {
  name: string;                              // Required
  description?: string;                      // Optional
  driver: AgentDriver<InferConfig<TConfigSchema>>;  // Required
  presenters?: AgentPresenter[];             // Optional
  configSchema?: TConfigSchema;              // Optional
}
```

### ConfigSchema

Define type-safe configuration:

```typescript
const schema = {
  apiKey: { type: "string", required: true },
  model: { type: "string", default: "claude-3" },
  temperature: { type: "number" },
  debug: { type: "boolean", default: false },
} as const satisfies ConfigSchema;

// Type is inferred as:
// {
//   apiKey: string;
//   model?: string;
//   temperature?: number;
//   debug?: boolean;
// }
type Config = InferConfig<typeof schema>;
```

### Field Types

```typescript
type FieldType = "string" | "number" | "boolean";

interface FieldDefinition {
  type: FieldType;
  required?: boolean;  // default: false
  default?: any;
  description?: string;
}
```

### Config Utilities

```typescript
import { validateConfig, applyDefaults, processConfig } from "@deepractice-ai/agentx-framework";

// Validate config against schema
const { valid, errors } = validateConfig(schema, config);

// Apply default values
const withDefaults = applyDefaults(schema, config);

// Validate + apply defaults (throws on error)
const processed = processConfig(schema, config);
```

## Design Philosophy

### Developer Controls Config

Framework does NOT define what config an agent should have. Examples:

```typescript
// Server Agent - developer decides to include:
// - apiKey (required for API calls)
// - systemPrompt (defines behavior)
// - model, temperature (tuning)

// Browser Agent - developer decides to include:
// - serverUrl (where to connect)
// - NO apiKey (security!)
// - NO systemPrompt (server handles it)
```

### Stateless Driver

Driver receives all config through context:

```typescript
const myDriver: AgentDriver<MyConfig> = {
  name: "MyDriver",
  async *receive(message, context) {
    // context.apiKey, context.model, etc.
    // Driver has NO internal state
  },
};
```

## Re-exports

Framework re-exports core interfaces for convenience:

```typescript
export type {
  AgentContext,
  AgentContextBase,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
} from "@deepractice-ai/agentx-core";
```

## Related Packages

- **[@deepractice-ai/agentx-core](../agentx-core)** - Agent lifecycle and session management
- **[@deepractice-ai/agentx-engine](../agentx-engine)** - Stateless event processing engine

## License

MIT
