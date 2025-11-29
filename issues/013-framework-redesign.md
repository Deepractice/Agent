# Issue 013: Framework Redesign - Stateless Driver & Context-based Architecture

**Status**: Implemented
**Priority**: High
**Created**: 2025-11-26
**Related**: Issue 010 (Engine Stateless), Issue 012 (Core DDD Refactoring)

## Overview

This issue documents the complete redesign of `agentx-framework` package. The goal is to create a clean, minimal framework that provides standard interfaces and a composition tool (`defineAgent`), with stateless drivers and context-based configuration.

## Background

### Current Problems

1. **Old framework was too complex** - Mixed concerns: defineDriver, defineReactor, defineConfig, defineAgent, SSE server, browser client
2. **Config scattered across layers** - Core had `AgentConfig` with driver-specific fields (model, temperature, maxTokens)
3. **Driver had state** - Each driver instance held its own configuration

### New Architecture Goals

1. **Framework as interfaces + composition** - Only provide AgentDriver, AgentPresenter, and defineAgent
2. **Stateless drivers** - Driver receives context, no internal state
3. **Config defined at Framework layer** - Schema defined by defineAgent, merged into context at runtime
4. **Core only manages runtime context** - AgentContext is internal, contains merged config + internal fields

## Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│  Framework Layer                                                 │
├─────────────────────────────────────────────────────────────────┤
│  AgentDriver      - receive(message, context) => events         │
│  AgentPresenter   - present(agentId, output)                    │
│  AgentDefinition  - name, driver, presenters, configSchema      │
│  defineAgent()    - creates AgentDefinition with config schema  │
│                                                                  │
│  Config schema is DEFINED here (dynamic, per-agent)             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Core Layer                                                      │
├─────────────────────────────────────────────────────────────────┤
│  AgentContext     - Internal runtime context                    │
│                     (agentId + createdAt + merged config)       │
│  Agent            - Instance, supports on() subscription        │
│  AgentContainer   - Manages Agent lifecycle                     │
│                                                                  │
│  NO config concept here - only context                          │
└─────────────────────────────────────────────────────────────────┘
```

### AgentDriver Interface

Stateless driver that receives context with each call:

```typescript
interface AgentDriver {
  /**
   * Driver name (for identification and logging)
   */
  readonly name: string;

  /**
   * Optional description
   */
  readonly description?: string;

  /**
   * Receive a user message and yield stream events
   * Driver is STATELESS - all config comes from context
   *
   * @param message - User message to process
   * @param context - Agent context (contains merged config)
   * @returns AsyncIterable of stream events
   */
  receive(message: UserMessage, context: AgentContext): AsyncIterable<StreamEventType>;
}
```

### AgentPresenter Interface

```typescript
interface AgentPresenter {
  /**
   * Presenter name (for identification and logging)
   */
  readonly name: string;

  /**
   * Optional description
   */
  readonly description?: string;

  /**
   * Present an agent output
   *
   * @param agentId - The agent ID
   * @param output - The output to present
   */
  present(agentId: string, output: AgentOutput): void | Promise<void>;
}
```

### AgentDefinition Interface

```typescript
interface AgentDefinition<TConfig = any> {
  /**
   * Agent name
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Driver (stateless)
   */
  driver: AgentDriver;

  /**
   * Presenters (optional)
   */
  presenters?: AgentPresenter[];

  /**
   * Config schema (defines what config this agent accepts)
   */
  configSchema?: ConfigSchema<TConfig>;
}
```

### defineAgent Function

```typescript
function defineAgent<TConfig>(options: AgentDefinitionOptions<TConfig>): AgentDefinition<TConfig> {
  // Validate options
  // Return frozen definition
  return Object.freeze({
    name: options.name,
    description: options.description,
    driver: options.driver,
    presenters: options.presenters,
    configSchema: options.configSchema,
  });
}
```

### AgentContext (Core Layer)

Internal runtime context that merges config with internal fields:

```typescript
interface AgentContext {
  /**
   * Unique agent ID (internally generated)
   */
  readonly agentId: string;

  /**
   * Creation timestamp (internally generated)
   */
  readonly createdAt: number;

  /**
   * All other fields come from merged config
   * Type is dynamic based on AgentDefinition's configSchema
   */
  [key: string]: unknown;
}
```

### Usage Flow

```typescript
// 1. Define a stateless driver
const claudeDriver: AgentDriver = {
  name: "Claude",

  async *receive(message, context) {
    // Get config from context - driver has no internal state!
    const client = new Anthropic({ apiKey: context.apiKey });

    const stream = client.messages.stream({
      model: context.model || "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: message.content }],
    });

    for await (const event of stream) {
      yield transformEvent(event);
    }
  },
};

// 2. Define agent with config schema
const ClaudeAgent = defineAgent({
  name: "ClaudeAssistant",
  driver: claudeDriver,
  presenters: [consolePresenter],
  configSchema: {
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-sonnet-4-20250514" },
    temperature: { type: "number", default: 0.7 },
  },
});

// 3. Create agent instance with config
const agent = createAgent(ClaudeAgent, {
  apiKey: "sk-xxx",
  model: "claude-sonnet-4-20250514",
});

// Internally, Core creates AgentContext:
// {
//   agentId: "agent_abc123",     // generated
//   createdAt: 1732617600000,    // generated
//   apiKey: "sk-xxx",            // from config
//   model: "claude-sonnet-4-20250514",  // from config
//   temperature: 0.7,            // from config (default)
// }

// 4. When agent receives message, driver gets context
await agent.receive("Hello!");
// → claudeDriver.receive(message, context)
// → driver reads context.apiKey, context.model, etc.
```

### Benefits

1. **Stateless Driver** - Same driver instance can serve multiple agents
2. **Unified Context** - No distinction between "internal state" and "external config"
3. **Core Simplicity** - Core doesn't know config structure, just merges and passes
4. **Framework Flexibility** - Each agent defines its own config schema
5. **Type Safety** - Config type inferred from schema
6. **Scalability** - Enables distributed architecture (Issue 011)

## File Structure

```
packages/agentx-framework/
├── src/
│   ├── AgentDriver.ts        # Driver interface
│   ├── AgentPresenter.ts     # Presenter interface
│   ├── AgentDefinition.ts    # Definition interface
│   ├── defineAgent.ts        # Composition function
│   ├── ConfigSchema.ts       # Config schema types
│   └── index.ts              # Public exports
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Implementation Plan

### Phase 1: Core Interfaces (Current)

- [x] Create AgentDriver interface
- [x] Create AgentPresenter interface
- [ ] Update AgentDriver to include context parameter

### Phase 2: Config Schema

- [ ] Design ConfigSchema types
- [ ] Implement type inference for config
- [ ] Add validation utilities

### Phase 3: defineAgent

- [ ] Implement AgentDefinition interface
- [ ] Implement defineAgent function
- [ ] Add validation

### Phase 4: Core Integration

- [ ] Refactor Core's AgentConfig → AgentContext
- [ ] Implement config merging logic
- [ ] Update Agent to pass context to driver

### Phase 5: Migration

- [ ] Update agentx-sdk-claude to use new pattern
- [ ] Update agentx-web to use new pattern
- [ ] Remove old framework code

## Comparison: Old vs New

### Old Design

```typescript
// Driver held its own config
class ClaudeDriver implements AgentDriver {
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config; // Stateful!
  }

  async *receive(message) {
    const client = new Anthropic({ apiKey: this.config.apiKey });
    // ...
  }
}

// Core's AgentConfig mixed concerns
interface AgentConfig {
  agentId?: string; // Instance
  sessionId?: string; // Session (wrong layer!)
  model?: string; // Driver-specific (wrong layer!)
  temperature?: number; // Driver-specific (wrong layer!)
}
```

### New Design

```typescript
// Driver is stateless - receives context
const claudeDriver: AgentDriver = {
  name: "Claude",
  async *receive(message, context) {
    const client = new Anthropic({ apiKey: context.apiKey });
    // ...
  },
};

// Framework defines config schema
const ClaudeAgent = defineAgent({
  driver: claudeDriver,
  configSchema: {
    apiKey: { type: "string", required: true },
    model: { type: "string" },
  },
});

// Core only has AgentContext (internal)
interface AgentContext {
  agentId: string; // Generated
  createdAt: number; // Generated
  // ... merged config fields
}
```

## Success Criteria

- [ ] Framework package contains only interfaces and defineAgent
- [ ] AgentDriver is stateless (receives context)
- [ ] Config schema defined at Framework layer
- [ ] Core has no config concept, only AgentContext
- [ ] Type inference works for config
- [ ] All existing functionality preserved
- [ ] Tests pass

## References

- Issue 010: Engine Stateless Architecture
- Issue 011: Distributed Architecture Design
- Issue 012: Core Package DDD Refactoring
- Previous session discussion on Framework redesign
