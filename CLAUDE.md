# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deepractice Agent (AgentX)** - Visual AI Agent interface without CLI. A full-stack TypeScript monorepo providing a browser-based interface for AI agents powered by Claude.

**Key Value Proposition**: Traditional AI agent tools require command-line expertise. AgentX provides full AI agent capabilities through a web interface, making AI agents accessible to everyone.

## Repository Structure

This is a **pnpm monorepo** with Turborepo build orchestration:

```
/Agent
├── apps/
│   ├── agentx-web/       # Full-stack web application (Vite + React + Node.js server)
│   └── agentx-cli/       # CLI tool (@deepractice-ai/agent npm package)
└── packages/
    ├── agentx-core/      # Core engine (platform-agnostic)
    ├── agentx-framework/ # Framework API (defineAgent, defineDriver, defineReactor)
    ├── agentx-sdk-claude/# Claude SDK integration
    ├── agentx-event/     # Event type definitions
    ├── agentx-types/     # Message & type definitions
    ├── agentx-logger/    # SLF4J-style logging facade
    └── agentx-ui/        # React UI components (Storybook)
```

## Common Commands

### Development

```bash
# Install all dependencies
pnpm install

# Start development (web app with hot reload)
pnpm dev

# Start specific package in dev mode
pnpm dev --filter=@deepractice-ai/agentx-ui
```

### Building

```bash
# Build all packages (respects dependency order)
pnpm build

# Build specific package
pnpm build --filter=@deepractice-ai/agentx-core
```

### Code Quality

```bash
# Type checking across all packages
pnpm typecheck

# Lint all code
pnpm lint

# Format code
pnpm format

# Check formatting (CI)
pnpm format:check
```

### Testing

```bash
# Run tests across all packages
pnpm test
```

### Cleanup

```bash
# Clean all build artifacts and node_modules
pnpm clean
```

## Architecture

### Core Concepts

**AgentX uses a 4-layer reactive event architecture:**

1. **Stream Layer** - Real-time incremental events (text deltas, tool calls)
2. **State Layer** - State machine transitions (thinking, responding, executing)
3. **Message Layer** - Complete messages (user/assistant/tool messages)
4. **Turn Layer** - Request-response analytics (cost, duration, tokens)

### Key Design Patterns

**Agent-as-Driver Pattern**: Since `AgentService extends AgentDriver`, agents can be composed as nested drivers, enabling unlimited agent chaining:

```typescript
// Agent A: Base Claude
const agentA = ClaudeAgent.create({ apiKey: "xxx" });

// Agent B: A + Translation (Agent as Driver!)
const agentB = defineAgent({
  driver: agentA,
  reactors: [TranslationReactor],
});

// Agent C: B + WebSocket (Chain continues!)
const agentC = defineAgent({
  driver: agentB,
  reactors: [WebSocketReactor],
});
```

**Reactor Pattern**: Event processors with managed lifecycles. All reactors implement `AgentReactor` interface with `initialize()` and `destroy()` methods called by `AgentEngine`.

**Define API**: Framework provides `defineDriver()`, `defineReactor()`, `defineConfig()`, and `defineAgent()` for composable agent creation.

### Package Layering

All packages follow strict directory structure:

```
packages/[package-name]/
├── src/
│   ├── api/           # Public API (user-facing interfaces)
│   ├── types/         # Exported type definitions
│   ├── core/          # Internal implementation (not exported)
│   └── index.ts       # Exports api/ and types/, NOT core/
```

**Philosophy**: Clear API boundaries. `core/` is implementation detail that can be freely refactored without breaking user code.

### Cross-platform Architecture

```
┌─────────────────────┐          ┌─────────────────────┐
│   Server (Node.js)  │          │   Browser (Web)     │
├─────────────────────┤          ├─────────────────────┤
│ AgentServer         │          │ defineAgent({       │
│ = ClaudeDriver      │  ←───→   │   driver: SSEDriver │
│   + SSEReactor      │   SSE    │ })                  │
│                     │          │                     │
│ • Generates Events  │  ─────→  │ • Receives Events   │
│ • Forwards via SSE  │  Events  │ • Renders to UI     │
└─────────────────────┘          └─────────────────────┘
```

## Development Workflow

### Working with Packages

**Important**: This is a Turborepo monorepo. Dependencies between packages are resolved by Turbo's task pipeline.

1. **Always build dependencies first**: If you modify `agentx-core`, run `pnpm build --filter=@deepractice-ai/agentx-core` before working with packages that depend on it.

2. **Use workspace references**: Packages use `"workspace:*"` protocol. Never use file paths.

3. **Path aliases**:
   - `~` - Internal package imports (e.g., `~/api`, `~/core`)
   - `@deepractice-ai/*` - Cross-package imports

### Working with agentx-web

The web app has both server and client:

```bash
# Development (runs both concurrently)
pnpm dev --filter=@deepractice-ai/agentx-web

# Server only
pnpm dev:server --filter=@deepractice-ai/agentx-web

# Client only
pnpm dev:client --filter=@deepractice-ai/agentx-web
```

**Environment Setup**: Copy `.env.example` to `.env.local` and configure:

```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

### Working with agentx-ui

UI components are built with Storybook:

```bash
# Start Storybook
pnpm dev --filter=@deepractice-ai/agentx-ui
```

**Message Components Structure**:
- `/components/chat/messages/` - Message containers (UserMessage, AssistantMessage, etc.)
- `/components/chat/messages/parts/` - Content parts (TextContent, ImageContent, ToolCallContent, etc.)

## Testing Strategy

- **E2E Testing**: Test `api/` layer (user-facing API)
- **Unit Testing**: Test `core/` layer (internal implementation)
- **Storybook**: Visual testing for UI components

## Coding Standards

**Language**: Use English for all code comments, logs, error messages, and documentation.

**Naming**: Use interface-first naming (not Hungarian notation):
- Good: `User`, `Session`, `Driver`
- Bad: `IUser`, `strName`, `arrItems`

**OOP Style**: Prefer class-based architecture (one class per file) following Java conventions.

**File Organization**: One type per file. Export via `index.ts` barrel files.

## Environment Variables (via turbo.json)

The following environment variables are passed to all tasks:

```env
NODE_ENV              # Environment mode
PORT                  # Server port (default: 5200)
ANTHROPIC_API_KEY     # Claude API key (required)
ANTHROPIC_BASE_URL    # API endpoint
PROJECT_PATH          # Project directory mount point
CONTEXT_WINDOW        # Context window size
LOG_LEVEL             # Logging level
DATABASE_PATH         # SQLite database path
```

## Docker Deployment

**Image**: `deepracticexs/agent:latest`

**Quick Start**:
```bash
docker run -d \
  --name agent \
  -p 5200:5200 \
  -e ANTHROPIC_API_KEY=sk-ant-xxxxx \
  -v $(pwd):/project \
  deepracticexs/agent:latest
```

**Docker Compose**: See `docker/agent/docker-compose.yml` for production setup.

## Release Process

**Changesets**: This project uses `@changesets/cli` for version management.

**Before Creating PR**:
```bash
# Create changeset file directly (interactive CLI is not available)
# Create file in .changeset/ directory with format:
# ---
# "@deepractice-ai/package-name": patch|minor|major
# ---
# Description of changes
```

**Publishing** (maintainers only):
```bash
pnpm changeset version  # Bump versions
pnpm build              # Build all packages
pnpm changeset publish  # Publish to npm
```

## Key Implementation Details

### Error Handling

AgentX uses unified error architecture where all errors flow through `ErrorMessageEvent`:

```typescript
interface ErrorMessage {
  role: "error";
  subtype: "system" | "agent" | "llm" | "validation" | "unknown";
  severity: "fatal" | "error" | "warning";
  message: string;
  code?: string;
  recoverable?: boolean;
  stack?: string;
}
```

Use `emitError()` utility from `agentx-core` to emit errors to EventBus.

### Event Bus (RxJS-based)

`AgentEventBus` is the communication backbone:
- Producers emit events via `EventProducer`
- Consumers subscribe via `EventConsumer`
- Type-safe event filtering with `consumeByType()`
- Automatic cleanup on `destroy()`

### Reactor Lifecycle

All reactors follow managed lifecycle:
1. `initialize(context)` - Called by AgentEngine on agent.initialize()
2. Event processing - Handle events via EventBus subscriptions
3. `destroy()` - Called in reverse order on agent.destroy()

### Driver Contract

Drivers must implement `AgentDriver`:
```typescript
interface AgentDriver {
  readonly sessionId: string;
  sendMessage(messages: UserMessage | AsyncIterable<UserMessage>):
    AsyncIterable<StreamEventType>;
  abort(): void;
  destroy(): Promise<void>;
}
```

**Built-in Drivers**:
- `ClaudeDriver` (agentx-sdk-claude) - Node.js Claude SDK integration
- `SSEDriver` (agentx-framework) - Browser SSE client

## Common Patterns

### Creating an Agent

```typescript
import { ClaudeAgent } from "@deepractice-ai/agentx-sdk-claude";

const agent = ClaudeAgent.create({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-5-20250929",
});

await agent.initialize();

agent.react({
  onAssistantMessage(event) {
    console.log(event.data.content);
  },
});

await agent.send("Hello!");
await agent.destroy();
```

### Defining Custom Components

```typescript
import { defineAgent, defineDriver, defineReactor } from "@deepractice-ai/agentx-framework";

const MyDriver = defineDriver({
  name: "MyDriver",
  generate: async function* (message) {
    // Stream events
    yield builder.messageStart("msg_1", "model");
    yield builder.textDelta("Hello", 0);
    yield builder.messageStop();
  }
});

const MyReactor = defineReactor({
  name: "MyReactor",
  onTextDelta: (event) => {
    process.stdout.write(event.data.text);
  }
});

const MyAgent = defineAgent({
  name: "MyAgent",
  driver: MyDriver,
  reactors: [MyReactor],
  config: defineConfig({
    apiKey: { type: "string", required: true }
  })
});
```

## Troubleshooting

**Build Failures**: Run `pnpm clean` then `pnpm install` to clear stale artifacts.

**Type Errors**: Run `pnpm typecheck` to see all type errors across packages.

**Dependency Issues**: Check `turbo.json` task dependencies. Some tasks depend on `^build` (dependencies built first).

**Hot Reload Not Working**: In `agentx-web`, ensure both server and client are running via `pnpm dev`.

## Related Documentation

- **Main README**: `/README.md` - User-facing documentation
- **Framework README**: `/packages/agentx-framework/README.md` - Framework API guide
- **Core README**: `/packages/agentx-core/README.md` - Architecture deep dive
- **Docker Guide**: `/docker/agent/README.md` - Deployment details
