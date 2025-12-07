# AgentX Documentation

The single source of truth for AgentX. All documentation is maintained in Markdown format and can be rendered by any framework.

## Structure

```
docs/
├── getting-started/     # Quick Start (5-10 minutes)
│   ├── installation.md  # Installation Guide
│   ├── quickstart.md    # Quick Start
│   └── first-agent.md   # Create Your First Agent
│
├── concepts/            # Core Concepts (Understanding)
│   ├── overview.md      # Architecture Overview
│   ├── event-system.md  # Four-Layer Event System
│   ├── lifecycle.md     # Lifecycle Management
│   └── mealy-machine.md # Mealy Machine Pattern
│
├── guides/              # Guides (Practical)
│   ├── events.md        # Event Subscription
│   ├── sessions.md      # Session Management
│   ├── persistence.md   # Persistence & Storage
│   └── tools.md         # MCP Tool Integration
│
├── api/                 # API Reference
│   ├── agentx.md        # AgentX High-Level API
│   ├── runtime.md       # Runtime API
│   ├── agent.md         # Agent API
│   └── events.md        # Event Types Reference
│
├── packages/            # Package Documentation
│   ├── types.md         # @agentxjs/types
│   ├── common.md        # @agentxjs/common
│   ├── agent.md         # @agentxjs/agent
│   ├── runtime.md       # @agentxjs/runtime
│   ├── agentx.md        # agentxjs
│   └── ui.md            # @agentxjs/ui
│
└── examples/            # Examples
    ├── chat-cli.md      # CLI Chat Application
    ├── chat-web.md      # Web Chat Application
    └── tool-use.md      # Tool Usage Examples
```

## Package Structure

```
@agentxjs/types        Type definitions (zero deps)
       ↑
@agentxjs/common       Logger facade
       ↑
@agentxjs/agent        AgentEngine (Mealy Machine processor)
       ↑
@agentxjs/runtime      Complete Runtime (Container, Session, Bus, Environment)
       ↑
agentxjs               Unified API (local/remote)
       ↑
@agentxjs/ui           React components (Storybook)
```

## Principles

1. **Single Source of Truth** - This documentation is the authoritative reference
2. **Code as Documentation** - All examples must be runnable
3. **Progressive Learning** - From beginner to advanced learning path
4. **Type-Safe** - TypeScript-first with full type definitions

## Learning Paths

### Beginner Path (15 minutes)

1. `getting-started/installation.md` - Install AgentX
2. `getting-started/quickstart.md` - 5-minute quick start
3. `getting-started/first-agent.md` - Build your first agent
4. `concepts/overview.md` - Understand the architecture

### Developer Path (1-2 hours)

1. `concepts/event-system.md` - Understand the 4-layer event system
2. `guides/events.md` - Event subscription patterns
3. `guides/sessions.md` - Session and conversation management
4. `guides/persistence.md` - Storage and persistence
5. `api/agentx.md` - Complete API reference

### Advanced Path (Deep Dive)

1. `concepts/mealy-machine.md` - Core processing pattern
2. `packages/agent.md` - AgentEngine internals
3. `packages/runtime.md` - Runtime architecture
4. Custom processor development

### Contributor Path

1. All of the above
2. `packages/types.md` - Type system design
3. `packages/common.md` - Shared infrastructure
4. Package README files in `packages/*/README.md`

## Quick Links

- **[Quick Start](./getting-started/quickstart.md)** - Get started in 5 minutes
- **[Architecture Overview](./concepts/overview.md)** - Understand the system
- **[Event System](./concepts/event-system.md)** - Core event architecture
- **[API Reference](./api/agentx.md)** - Complete API documentation

## Related Resources

- [GitHub Repository](https://github.com/Deepractice/Agent)
- [Package READMEs](../packages/) - Detailed package documentation
- [Examples](../examples/) - Code examples and samples
