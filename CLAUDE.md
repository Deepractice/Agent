# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgentX** - Agent Runtime, Docker Style

A TypeScript monorepo providing Docker-style lifecycle management for AI Agents. Production-ready framework with commit, resume, and fork capabilities.

**Key Features:**

- **Docker-style Lifecycle**: Definition → Image → Session → Agent
- **4-Layer Event System**: Stream → State → Message → Turn
- **Isomorphic Architecture**: Same API for Server (Node.js) and Browser

## Repository Structure

This is a **pnpm monorepo** with Turborepo build orchestration:

```
/AgentX
└── packages/
    ├── agentx-types/     # Type definitions (140+ files, zero dependencies)
    ├── agentx-common/    # Shared utilities (Logger facade)
    ├── agentx-engine/    # Mealy Machine event processor
    ├── agentx-agent/     # Agent runtime core
    ├── agentx/           # Platform API (AgentX, definitions, images, sessions)
    ├── agentx-node/      # Node.js runtime (ClaudeDriver, SQLiteRepository)
    └── agentx-ui/        # React UI components (Storybook)
```

**Package Dependency Flow:**

```
agentx-types (zero dependencies)
    ↓
agentx-common (logger facade)
    ↓
agentx-engine (Mealy Machine)
    ↓
agentx-agent (Agent runtime)
    ↓
agentx (Platform API)
    ↓
agentx-node (Node.js: ClaudeDriver, SQLite, FileLogger)
    ↓
agentx-ui (React components)
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
pnpm build --filter=@deepractice-ai/agentx-agent
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

### Docker-Style Lifecycle (Core Concept)

AgentX brings Docker-style lifecycle management to AI Agents:

```
AgentDefinition ──register──▶ MetaImage ──create──▶ Session + Agent
      │                           │                        │
   (source)                   (genesis)               (running)
                                  │                        │
                                  │◀──────commit───────────┘
                                  │
                            DerivedImage ──fork──▶ New Session
                              (snapshot)
```

| Docker          | AgentX                       | Description                      |
| --------------- | ---------------------------- | -------------------------------- |
| Dockerfile      | `defineAgent()`              | Source template                  |
| Image           | `MetaImage` / `DerivedImage` | Built artifact with frozen state |
| Container       | `Session` + `Agent`          | Running instance                 |
| `docker commit` | `session.commit()`           | Save current state               |
| `docker run`    | `session.resume()`           | Start from image                 |

**Key Types:**

- **AgentDefinition**: Static template (name, systemPrompt)
- **MetaImage**: Genesis image (auto-created from Definition, empty messages)
- **DerivedImage**: Committed image (from session.commit(), has messages)
- **Session**: User-facing wrapper (userId, title, imageId)
- **Agent**: Running instance

### 4-Layer Event Architecture

```
Driver.receive()
       │ yields
       ▼
┌─────────────────────────────────────────────────────────┐
│ L1: Stream Layer (real-time incremental)                │
│ message_start → text_delta* → tool_call → message_stop  │
└────────────────────────┬────────────────────────────────┘
                         │ Mealy Machine
                         ▼
┌─────────────────────────────────────────────────────────┐
│ L2: State Layer (state transitions)                     │
│ thinking → responding → tool_executing → conversation_end│
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ L3: Message Layer (complete messages)                   │
│ user_message, assistant_message, tool_call_message      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ L4: Turn Layer (analytics)                              │
│ turn_request → turn_response { duration, tokens, cost } │
└─────────────────────────────────────────────────────────┘
```

| Layer   | Consumer      | Use Case                              |
| ------- | ------------- | ------------------------------------- |
| Stream  | UI            | Typewriter effect, real-time display  |
| State   | State machine | Loading indicators, progress tracking |
| Message | Chat history  | Persistence, conversation display     |
| Turn    | Analytics     | Billing, usage metrics, performance   |

### Runtime Architecture

Runtime is the infrastructure layer providing all resources for Agent execution:

```
┌─────────────────────────────────────────────────────────────┐
│                       Runtime Interface                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Container  │  │   Sandbox   │  │     Repository      │  │
│  │ (lifecycle) │  │  (OS + LLM) │  │ (storage abstract)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   NodeRuntime   │ │   SSERuntime    │ │  (Future...)    │
│   (Server)      │ │   (Browser)     │ │  EdgeRuntime    │
│                 │ │                 │ │                 │
│ SQLiteRepository│ │ RemoteRepository│ │                 │
│ ClaudeDriver    │ │ SSEDriver       │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Isomorphic Design:**

Same application code runs on Server and Browser. Business code depends on Runtime interface, not concrete implementations:

- **Server**: `NodeRuntime` with `SQLiteRepository`, `ClaudeDriver`
- **Browser**: `SSERuntime` with `RemoteRepository`, `SSEDriver`

### Mealy Machine Pattern

**"State is Means, Output is Goal"**

```typescript
// Mealy Machine: (state, input) → (state, outputs)
type Processor<TState, TInput, TOutput> = (state: TState, input: TInput) => [TState, TOutput[]];

// State is accumulator (means to track progress)
// Outputs are the goal (events we want to produce)
```

**Benefits:**

- Pure functions: Testable without mocks
- Focus on event production, not state management
- State is implementation detail that can be refactored freely

## API Patterns

### Basic Usage

```typescript
import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
import { NodeRuntime } from "@deepractice-ai/agentx-node";

// 1. Create runtime and platform
const runtime = new NodeRuntime({ apiKey: process.env.ANTHROPIC_API_KEY });
const agentx = createAgentX(runtime);

// 2. Define and register agent
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are a helpful assistant.",
});
agentx.definitions.register(MyAgent);

// 3. Get image and create session
const image = await agentx.images.getMetaImage("Assistant");
const session = await agentx.sessions.create(image.imageId, "user-1");

// 4. Resume agent and chat
const agent = await session.resume();

agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onAssistantMessage: (e) => console.log("\n[Done]"),
});

await agent.receive("Hello!");

// 5. Save state
await session.commit();
```

### Event Subscription

```typescript
// Pattern 1: React-style (recommended)
agent.react({
  onTextDelta: (e) => {},
  onAssistantMessage: (e) => {},
  onToolCall: (e) => {},
});

// Pattern 2: Type-safe single event
agent.on("text_delta", (e) => {
  console.log(e.data.text);
});

// Pattern 3: Batch subscription
agent.on({
  text_delta: (e) => {},
  assistant_message: (e) => {},
});
```

### Session Management

```typescript
// Resume from previous session
const session = await agentx.sessions.get(sessionId);
const agent = await session.resume();

// Fork conversation (branch)
const forkedSession = await session.fork();

// List user's sessions
const sessions = await agentx.sessions.list({ userId: "user-1" });
```

## Package Details

### agentx-types

**Purpose**: Foundation type system (140+ files, zero dependencies)

**Key Types:**

- Agent contracts: `Agent`, `AgentDriver`, `AgentDefinition`, `AgentContext`
- Event hierarchy: `StreamEventType`, `StateEventType`, `MessageEventType`, `TurnEventType`
- Message types: `UserMessage`, `AssistantMessage`, `ToolCallMessage`, `ToolResultMessage`
- Docker-style: `MetaImage`, `DerivedImage`, `Session`
- Runtime: `Runtime`, `Container`, `Sandbox`, `Repository`
- Error taxonomy: `AgentError`, `LLMError`, `NetworkError`

### agentx-common

**Purpose**: Shared utilities across packages

**Key Components:**

- `LoggerFactoryImpl` - Logger factory implementation
- `ConsoleLogger` - Console-based logger

### agentx-engine

**Purpose**: Pure Mealy Machine event processor

**Key Components:**

- `AgentEngine` - Per-agent Mealy runtime
- `Mealy` - Generic Mealy Machine runtime
- Processors: `messageAssemblerProcessor`, `stateEventProcessor`, `turnTrackerProcessor`

### agentx-agent

**Purpose**: Agent runtime and lifecycle management

**Key Components:**

- `AgentInstance` - Main agent implementation
- `AgentEventBus` - RxJS-based event system
- `AgentStateMachine` - State transition manager
- `MemoryAgentContainer` - In-memory agent container

### agentx

**Purpose**: Platform API (unified entry point)

**Key Components:**

- `createAgentX(runtime)` - Platform factory
- `defineAgent()` - Agent definition helper
- Managers: `DefinitionManager`, `ImageManager`, `SessionManager`, `AgentManager`
- Server: `createAgentXHandler()`, `SSEConnection`

**AgentX API Structure:**

```typescript
agentx.definitions.register(def); // Register definition
agentx.definitions.get(name); // Get definition

agentx.images.getMetaImage(name); // Get genesis image
agentx.images.list(); // List all images

agentx.sessions.create(imageId, userId); // Create session
agentx.sessions.get(sessionId); // Get session
agentx.sessions.list({ userId }); // List sessions

agentx.agents.get(agentId); // Get running agent
```

### agentx-node

**Purpose**: Node.js runtime implementation

**Key Components:**

- `NodeRuntime` - Node.js runtime with all infrastructure
- `ClaudeDriver` - Claude SDK integration
- `SQLiteRepository` - SQLite-based persistence
- `FileLogger` / `FileLoggerFactory` - File-based logging

### agentx-ui

**Purpose**: React component library (Storybook)

**Key Components:**

- Chat: `<Chat>`, `<ChatInput>`, `<ChatMessageList>`
- Messages: `<UserMessage>`, `<AssistantMessage>`, `<ToolCallMessage>`
- Parts: `<TextContent>`, `<ImageContent>`, `<ToolCallContent>`

## Cross-Platform Architecture

Server only forwards Stream Layer events. Browser's AgentEngine reassembles higher-level events.

```
Server (Node.js)                          Browser (Web)
─────────────────                         ─────────────
ClaudeDriver                              EventSource
    ↓ Stream Events                           ↓ receives
AgentEngine.process()                     SSEDriver
    ↓                                         ↓
SSE (only Stream events) ──────────────▶  AgentEngine.process()
                                              ↓ reassembles
                                          Message/State/Turn events
                                              ↓
                                          UI Render
```

**Why?**

1. **Efficient**: Only transmit incremental Stream events
2. **Decoupling**: Server doesn't know how client uses events
3. **Consistency**: Same AgentEngine code runs everywhere

## Coding Standards

**Language**: Use English for all code comments, logs, error messages.

**Naming Conventions:**

- **Classes**: PascalCase with suffixes (`*Driver`, `*Manager`, `*Repository`, `*Container`)
- **Interfaces**: No `I` prefix (`Agent`, not `IAgent`)
- **Events**: snake_case (`text_delta`, `assistant_message`)
- **Functions**: camelCase with verb prefixes (`create*`, `build*`)

**File Organization:**

- One type per file
- Feature-based directories
- Barrel exports via `index.ts`

**Logging:**

```typescript
import { createLogger } from "@deepractice-ai/agentx-common";

const logger = createLogger("engine/AgentEngine");
logger.debug("Processing event", { agentId, eventType });
```

Never use direct `console.*` calls (except in tests/stories).

## Environment Variables

```env
NODE_ENV              # Environment mode
PORT                  # Server port (default: 5200)
ANTHROPIC_API_KEY     # Claude API key (required)
ANTHROPIC_BASE_URL    # API endpoint
LOG_LEVEL             # Logging level (debug/info/warn/error)
DATABASE_PATH         # SQLite database path
```

## Docker Deployment

```bash
docker run -d \
  --name agentx \
  -p 5200:5200 \
  -e ANTHROPIC_API_KEY=sk-ant-xxxxx \
  deepracticexs/agent:latest
```

## Release Process

This project uses `@changesets/cli` for version management.

```bash
# Create changeset file in .changeset/ directory:
# ---
# "@deepractice-ai/package-name": patch|minor|major
# ---
# Description of changes

pnpm changeset version  # Bump versions
pnpm build              # Build all packages
pnpm changeset publish  # Publish to npm
```

## Summary

**AgentX Architecture Principles:**

1. **Docker-style Lifecycle**: Definition → Image → Session → Agent
2. **4-Layer Events**: Stream → State → Message → Turn
3. **Mealy Machines**: Pure event processing ("state is means, output is goal")
4. **Isomorphic**: Same API for Node.js and Browser
5. **Stream-Only SSE**: Server forwards Stream events, browser reassembles
6. **Type-Safe**: 140+ TypeScript definitions

**Critical Design Decisions:**

- Server forwards Stream events only (NOT assembled messages)
- Browser has full AgentEngine (complete reassembly)
- State is implementation detail (Mealy philosophy)
- Errors flow through event system
- Logger facade with lazy initialization
