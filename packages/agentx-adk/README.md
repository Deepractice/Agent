# @deepractice-ai/agentx-adk

Agent Development Kit (ADK) - Tools for building AgentX drivers and agents.

## Overview

The ADK provides a set of development tools for creating type-safe, composable AgentX drivers and agents. It separates development-time concerns (defining drivers/agents) from runtime concerns (using them).

## Installation

```bash
npm install @deepractice-ai/agentx-adk
# or
pnpm add @deepractice-ai/agentx-adk
```

## Quick Start

### 1. Define Configuration

```typescript
import { defineConfig } from "@deepractice-ai/agentx-adk";

const myConfig = defineConfig({
  apiKey: {
    type: "string",
    scope: "instance",
    required: true,
    fromEnv: "MY_API_KEY",
    sensitive: true,
    description: "API key for authentication",
  },
  model: {
    type: "string",
    scope: "definition",
    default: "my-model-v1",
    description: "Model identifier",
  },
  systemPrompt: {
    type: "string",
    scope: "definition",
    overridable: true,
    description: "System prompt for the agent",
  },
});
```

### 2. Define Driver

```typescript
import { defineDriver } from "@deepractice-ai/agentx-adk";

const MyDriver = defineDriver({
  name: "MyDriver",
  description: "Custom AI driver",
  config: myConfig,
  create: (context) => ({
    name: "MyDriver",
    async *receive(message) {
      // Implementation
      yield {
        type: "text_delta",
        agentId: context.agentId,
        text: "Hello",
        index: 0,
      };
    },
    async destroy() {
      // Cleanup
    },
  }),
});
```

### 3. Define Agent

```typescript
import { defineAgent } from "@deepractice-ai/agentx-adk";

const MyAgent = defineAgent({
  name: "MyAssistant",
  description: "A helpful AI assistant",
  driver: MyDriver,
  config: {
    model: "my-model-v2", // Type-safe!
    systemPrompt: "You are a helpful assistant",
  },
});
```

### 4. Use at Runtime

```typescript
import { createAgentX } from "@deepractice-ai/agentx";

// Runtime usage
const agentx = createAgentX();
const agent = agentx.agents.create(MyAgent, {
  apiKey: "sk-xxxxx", // Instance-level config
});

await agent.receive("Hello!");
```

## API Reference

### `defineConfig(schema)`

Creates a reusable configuration definition.

**Parameters:**

- `schema`: `ConfigSchema` - Configuration field definitions

**Returns:**

- `ConfigDefinition<S>` - Configuration definition with utilities

### `defineDriver(input)`

Creates a type-safe driver class with configuration schema.

**Parameters:**

- `input.name`: `string` - Driver name
- `input.description`: `string` (optional) - Driver description
- `input.config`: `ConfigDefinition` - Configuration from defineConfig
- `input.create`: `(context) => AgentDriver` - Factory function

**Returns:**

- `DriverClass & { schema: S }` - Driver class with schema attached

### `defineAgent(input)`

Creates an agent definition (template).

**Parameters:**

- `input.name`: `string` - Agent name
- `input.description`: `string` (optional) - Agent description
- `input.driver`: `DriverClass` - Driver from defineDriver
- `input.presenters`: `AgentPresenter[]` (optional) - Output handlers
- `input.config`: `DefinitionConfig<S>` (optional) - Definition-level config

**Returns:**

- `AgentDefinition<TDriver>` - Agent definition

## Configuration Scopes

ADK supports two configuration scopes:

- **`definition`**: Set by agent developer in `defineAgent()`
- **`instance`**: Set by app developer in `agentx.agents.create()`

Fields can be marked as `overridable` to allow instance-level override of definition-level values.

## Type Safety

The ADK provides end-to-end type safety:

```typescript
const config = defineConfig({
  apiKey: { type: "string", scope: "instance", required: true },
});

const driver = defineDriver({ config, create: ... });
// ↓ schema automatically attached

const agent = defineAgent({ driver, config: { ... } });
// ↓ config type automatically inferred from driver schema

agentx.agents.create(agent, { apiKey: "..." });
// ↓ TypeScript enforces required fields
```

## Documentation Generation

Configuration definitions can generate documentation:

```typescript
const config = defineConfig({ ... });

// Generate Markdown documentation
const markdown = config.toMarkdown();

// Generate JSON Schema
const jsonSchema = config.toJSONSchema();
```

## License

MIT © Deepractice AI
