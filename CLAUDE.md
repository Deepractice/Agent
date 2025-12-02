# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deepractice Agent (AgentX)** - Event-driven AI Agent framework with cross-platform support. A TypeScript monorepo providing both Node.js and browser-based AI agent capabilities powered by Claude.

**Key Value Proposition**: Production-ready agent framework with Mealy Machine architecture, 4-layer event system, and seamless server-browser communication.

## Repository Structure

This is a **pnpm monorepo** with Turborepo build orchestration:

```
/AgentX
├── apps/
│   └── portagent/        # AgentX Portal - Web UI with auth (Hono + Vite + React)
└── packages/
    ├── agentx-types/     # Type definitions (140+ files, zero dependencies)
    ├── agentx-common/    # Internal shared utilities (logger facade)
    ├── agentx-engine/    # Mealy Machine event processor
    ├── agentx-agent/     # Agent runtime
    ├── agentx/           # Platform API (local/remote, server/client)
    ├── agentx-runtime/      # Node.js runtime (Claude driver, SQLite, FileLogger)
    └── agentx-ui/        # React UI components (Storybook, Tailwind v4)
```

## Common Commands

### Development

```bash
# Install all dependencies
pnpm install

# Start development (web app with hot reload)
pnpm dev

# Start specific package in dev mode
pnpm dev --filter=@agentxjs/ui
```

### Building

```bash
# Build all packages (respects dependency order)
pnpm build

# Build specific package
pnpm build --filter=@agentxjs/agent
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

### Key Design Philosophy

**"State is Means, Output is Goal"** - Mealy Machine Pattern

```typescript
// Mealy Machine: (state, input) → (state, outputs)
type Processor<TState, TInput, TOutput> = (state: TState, input: TInput) => [TState, TOutput[]];

// State is just accumulator (means to track progress)
interface MessageAssemblerState {
  pendingContents: Record<number, string[]>; // Accumulator
}

// Outputs are the goal (events we want to produce)
type MessageAssemblerOutput =
  | AssistantMessageEvent // ← This is what matters!
  | ToolCallMessageEvent;
```

**Benefits:**

- Pure functions: Testable without mocks
- Focus on event production, not state management
- State is implementation detail that can be refactored freely

### Key Design Patterns

**1. Mealy Machine Architecture**

The Engine layer uses Mealy Machines to transform Stream events into higher-level events:

```typescript
// AgentEngine: Per-agent Mealy runtime
class AgentEngine {
  process(agentId: string, event: StreamEventType): AgentOutput[] {
    // 1. Get per-agent state
    const state = this.store.get(agentId) ?? initialState;

    // 2. Pass-through original event
    const outputs = [event];

    // 3. Process through Mealy processors
    const [newState, processed] = agentProcessor(state, event);
    outputs.push(...processed);

    // 4. Store state
    this.store.set(agentId, newState);

    return outputs;
  }
}
```

**Mealy Processors:**

- `MessageAssembler`: Accumulates text_delta → emits AssistantMessage
- `StateEventProcessor`: Generates state transition events
- `TurnTracker`: Tracks analytics (cost, tokens, duration)

**2. Agent-as-Driver Pattern**

Agents implement the same interface as drivers, enabling unlimited composition:

```typescript
const agentA = ClaudeAgent.create({ apiKey: "xxx" });

// Agent B wraps Agent A (agent as driver!)
const agentB = createAgent({
  definition: defineAgent({
    driver: agentA, // ← Agent acts as driver
    presenters: [TranslationPresenter],
  }),
});

// Agent C wraps Agent B (chain continues!)
const agentC = createAgent({
  definition: defineAgent({
    driver: agentB,
    presenters: [WebSocketPresenter],
  }),
});
```

**3. Event-Driven Architecture**

All communication happens through RxJS-based EventBus:

```typescript
// Subscribe to events
agent.on("assistant_message", (event) => {
  console.log(event.data.content);
});

// React-style API
agent.react({
  onTextDelta: (event) => process.stdout.write(event.data.text),
  onAssistantMessage: (event) => console.log(event.data.content),
  onToolCall: (event) => console.log(event.data.toolCall),
});
```

**4. Middleware/Interceptor Pattern**

- **Middleware**: Intercept incoming messages (before driver)
- **Interceptor**: Intercept outgoing events (after engine, before eventBus)

```typescript
// Middleware example: Rate limiting
const rateLimitMiddleware = async (message, next) => {
  if (await checkRateLimit()) {
    return next(message);
  }
  throw new Error("Rate limit exceeded");
};

// Interceptor example: Filter sensitive data
const filterInterceptor = async (event, next) => {
  if (event.type === "assistant_message") {
    event.data.content = filterSensitive(event.data.content);
  }
  return next(event);
};
```

### Package Layering

**Package Dependency Hierarchy**:

```
agentx-types (140+ type definitions, logger type declarations)
    ↓
agentx-common (Internal: logger facade with lazy initialization)
    ↓
agentx-engine (Mealy Machine processors)
    ↓
agentx-agent (Agent runtime)
    ↓
agentx (Platform API: local/remote, server/client)
    ↓
agentx-runtime (Node.js runtime: Claude driver, SQLite, FileLogger)
    ↓
agentx-ui (React components)
```

**Layer Responsibilities:**

| Layer        | Package          | Responsibility                                               |
| ------------ | ---------------- | ------------------------------------------------------------ |
| **Types**    | `agentx-types`   | Pure type definitions, logger type declarations              |
| **Common**   | `agentx-common`  | Internal shared utilities (logger facade)                    |
| **Engine**   | `agentx-engine`  | Pure event processing (Mealy Machines)                       |
| **Agent**    | `agentx-agent`   | Agent runtime, EventBus, lifecycle management                |
| **Platform** | `agentx`         | Docker-style API (5 managers), SSE server/client, sseRuntime |
| **Node**     | `agentx-runtime` | Node.js runtime (Claude driver, SQLite, FileLogger)          |
| **UI**       | `agentx-ui`      | React components, Storybook, Tailwind v4                     |

**Directory Structure** (all packages follow this):

```
packages/[package-name]/
├── src/
│   ├── api/           # NOT USED (agentx-types pattern only)
│   ├── types/         # NOT USED (agentx-types pattern only)
│   ├── core/          # NOT USED (agentx-types pattern only)
│   ├── [feature]/     # Feature-based organization
│   │   ├── *.ts       # Implementation files
│   │   └── index.ts   # Feature exports
│   └── index.ts       # Package entry point
└── package.json
```

**Note**: The `api/types/core` structure mentioned in some docs is NOT actually used. Packages use feature-based organization directly under `src/`.

### Cross-Platform Architecture

AgentX uses **Stream Events forwarding + Client-side reassembly** for server-browser communication.

#### Core Design Principle

**Critical Rule**: Server ONLY forwards Stream Layer events. Browser's AgentEngine automatically reassembles Message/State/Turn Layer events.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Server (Node.js)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ClaudeSDKDriver                                                     │
│       ↓ yields Stream Events (text_delta, tool_call, etc.)          │
│  AgentInstance.receive()                                             │
│       ↓                                                              │
│  AgentEngine.process()                                               │
│       ├─ Pass-through: Stream Events                                 │
│       ├─ MessageAssembler: → Message Events (server local use)       │
│       ├─ StateEventProcessor: → State Events (server local use)      │
│       └─ TurnTracker: → Turn Events (server local use)              │
│       ↓                                                              │
│  SSEConnection.send()                                                │
│       ↓ FILTER: Only forward Stream Events!                         │
│  SSE → HTTP Response Stream                                          │
│       ↓                                                              │
└───────┼──────────────────────────────────────────────────────────────┘
        │ SSE (Server-Sent Events)
        │ Only transmits Stream Events (efficient, low bandwidth)
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Web)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  EventSource (Browser API)                                           │
│       ↓ receives Stream Events                                       │
│  SSEDriver.receive()                                                 │
│       ↓ yields to                                                    │
│  AgentInstance.receive() (browser)                                   │
│       ↓                                                              │
│  AgentEngine.process() (browser - FULL engine!)                      │
│       ├─ Pass-through: Stream Events                                 │
│       ├─ MessageAssembler: → Message Events (reassembled!)           │
│       ├─ StateEventProcessor: → State Events (generated!)            │
│       └─ TurnTracker: → Turn Events (tracked!)                      │
│       ↓                                                              │
│  EventBus.emit()                                                     │
│       ↓                                                              │
│  User Subscriptions (React hooks, etc.)                              │
│       ↓                                                              │
│  UI Render                                                           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

#### Why This Design?

1. **Efficient Transmission**: Only transmit incremental Stream Events (low bandwidth)
2. **Decoupling**: Server doesn't need to know how client uses events
3. **Flexibility**: Different clients (Web, mobile) can assemble differently
4. **Consistency**: Same AgentEngine code runs everywhere (Node.js + Browser)

#### Event Flow Details

**Stream Layer Events** (transmitted via SSE):

```typescript
type StreamEventType =
  | "message_start" // Message processing begins
  | "text_delta" // Text fragment: "Hel" + "lo" = "Hello"
  | "text_content_block_start" // Text block starts
  | "text_content_block_stop" // Text block ends
  | "tool_use_content_block_start" // Tool call starts
  | "input_json_delta" // Tool param JSON: {"na" + "me":"Bash"}
  | "tool_use_content_block_stop" // Tool params complete
  | "tool_call" // Tool invocation (complete params)
  | "tool_result" // Tool execution result
  | "message_stop"; // Message processing complete
```

**Message Layer Events** (browser-side reassembly, NOT transmitted):

```typescript
type MessageEventType =
  | "user_message" // User input
  | "assistant_message" // Complete AI response (from text_delta)
  | "tool_call_message" // Tool call record
  | "tool_result_message" // Tool result record
  | "error_message"; // Error occurred
```

**State Layer Events** (browser-side generation, NOT transmitted):

```typescript
type StateEventType =
  | "agent_ready" // Agent initialized
  | "conversation_queued" // Message queued
  | "conversation_start" // Processing starts
  | "conversation_thinking" // AI thinking
  | "conversation_responding" // AI generating text
  | "tool_planned" // AI decided to call tool
  | "tool_executing" // Tool running
  | "tool_completed" // Tool finished
  | "conversation_end" // Turn complete
  | "error_occurred"; // Error state
```

**Turn Layer Events** (browser-side analytics, NOT transmitted):

```typescript
type TurnEventType =
  | "turn_request" // User message received
  | "turn_response"; // Complete turn analytics
// { duration, inputTokens, outputTokens, cost }
```

#### Key Components

**Server Side** (`agentx` package):

- `createAgentXHandler()` - HTTP request handler (Web Standard Request/Response)
- `SSEConnection` - SSE transport implementation (ReadableStream)
- `SSEConnectionManager` - Manages SSE connections per agent
- Framework adapters: `toExpressHandler()`, `toHonoHandler()`, `createNextHandler()`

**Browser Side** (`agentx` package):

- `sseRuntime()` - Browser runtime factory
- `SSEDriver` - EventSource-based driver with persistent connection
- `RemoteContainer` - Calls server to create/resume agents, caches locally
- `RemoteRepository` - HTTP-based persistence (noop for saveMessage)
- `BrowserLogger` - Styled console logging for browser
- Full `AgentEngine` runs in browser (reassembles all events)

#### SSE API Endpoints

| Method | Path                            | Description            |
| ------ | ------------------------------- | ---------------------- |
| GET    | `/info`                         | Platform info          |
| GET    | `/health`                       | Health check           |
| GET    | `/definitions`                  | List all definitions   |
| GET    | `/definitions/:name`            | Get definition by name |
| POST   | `/definitions`                  | Register definition    |
| DELETE | `/definitions/:name`            | Unregister definition  |
| GET    | `/images`                       | List all images        |
| GET    | `/images/:imageId`              | Get image by ID        |
| POST   | `/images/:imageId/run`          | Run agent from image   |
| DELETE | `/images/:imageId`              | Delete image           |
| GET    | `/agents`                       | List all agents        |
| GET    | `/agents/:agentId`              | Get agent info         |
| DELETE | `/agents/:agentId`              | Destroy agent          |
| GET    | `/agents/:agentId/sse`          | SSE event stream       |
| POST   | `/agents/:agentId/messages`     | Send message to agent  |
| POST   | `/agents/:agentId/interrupt`    | Interrupt processing   |
| GET    | `/sessions`                     | List all sessions      |
| GET    | `/sessions/:sessionId`          | Get session by ID      |
| POST   | `/sessions`                     | Create session         |
| POST   | `/sessions/:sessionId/resume`   | Resume session         |
| POST   | `/sessions/:sessionId/fork`     | Fork session           |
| GET    | `/sessions/:sessionId/messages` | Get session messages   |
| DELETE | `/sessions/:sessionId`          | Destroy session        |

**Correct Usage Flow:**

```typescript
// Server-side setup
import { defineAgent, createAgentX } from "agentxjs";
import { nodeRuntime } from "@agentxjs/node-runtime";

const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are helpful",
});

const agentx = createAgentX(nodeRuntime());
agentx.definitions.register(MyAgent);

// 1. Run agent from image
const metaImage = agentx.images.getMetaImage(MyAgent.name);
const agent = await agentx.images.run(metaImage.id);

// Browser-side setup
import { defineAgent, createAgentX } from "agentxjs";
import { sseRuntime } from "agentxjs/client";

const runtime = sseRuntime({
  serverUrl: "http://localhost:5200/agentx",
});
const agentx = createAgentX(runtime);

// 2. Register same definition (syncs with server)
agentx.definitions.register(MyAgent);

// 3. Run agent (RemoteContainer calls server, creates local agent with SSEDriver)
const metaImage = agentx.images.getMetaImage(MyAgent.name);
const agent = await agentx.images.run(metaImage.id);

// 4. Subscribe to events (browser's AgentEngine reassembles)
agent.on("assistant_message", (event) => console.log(event.data.content));

// 5. Send message (SSEDriver posts to server)
await agent.receive("Hello!");

// 6. Server processes, forwards Stream Events via SSE
// 7. Browser AgentEngine reassembles Message/State/Turn events
// 8. UI updates via event subscriptions
```

#### Critical Reminder

**⚠️ DO NOT modify SSE transport to forward Message Layer events!**

This is a common mistake. The architecture is intentionally designed this way:

✅ **Correct**: Server forwards Stream Events, browser reassembles
❌ **Wrong**: Server assembles Messages, forwards complete messages

**If browser doesn't receive Message Events:**

1. ✅ Check: Does browser receive Stream Events from SSE?
2. ✅ Check: Is browser's AgentEngine initialized correctly?
3. ✅ Check: Is MessageAssembler registered and working?
4. ❌ DO NOT: Add Message Event forwarding to server SSE code

This separation ensures clean server-browser boundaries.

## Development Workflow

### Working with Packages

**Important**: This is a Turborepo monorepo. Dependencies between packages are resolved by Turbo's task pipeline.

1. **Always build dependencies first**: If you modify `agentx-agent`, run `pnpm build --filter=@agentxjs/agent` before working with packages that depend on it.

2. **Use workspace references**: Packages use `"workspace:*"` protocol. Never use file paths.

3. **Path aliases**:
   - `~` - Internal package imports (e.g., `~/agent`, `~/session`)
   - `@agentxjs/*` - Cross-package imports

### Working with agentx-web

The web app has both server and client:

```bash
# Development (runs both concurrently)
pnpm dev --filter=@agentxjs/portagent

# Server only
pnpm dev:server --filter=@agentxjs/portagent

# Client only
pnpm dev:client --filter=@agentxjs/portagent
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
pnpm dev --filter=@agentxjs/ui
```

**Message Components Structure**:

- `/components/chat/messages/` - Message containers (UserMessage, AssistantMessage, etc.)
- `/components/chat/messages/parts/` - Content parts (TextContent, ImageContent, ToolCallContent, etc.)

### Working with Portagent

Portagent is the AgentX Portal - a complete web application with authentication.

```bash
# Development (server + client concurrently)
cd apps/portagent
pnpm dev

# Server only (Hono on port 5200)
pnpm dev:server

# Client only (Vite on port 5173)
pnpm dev:client
```

**Environment Setup**: Create `.env.local` in `apps/portagent/`:

```env
PORTAGENT_PASSWORD=your-password    # Login password
LLM_PROVIDER_KEY=sk-ant-xxxxx       # Claude API key
```

**Tech Stack**:

- **Server**: Hono + JWT authentication
- **Client**: React + Vite + Tailwind v4 (CSS-first config)
- **UI**: Uses `@agentxjs/ui` Workspace component

**Tailwind v4 Note**: Uses `@theme` directive in CSS instead of `tailwind.config.js`. Design tokens defined in `src/client/styles/globals.css`.

## Testing Strategy

- **Unit Testing**: Test pure functions (Mealy processors, utilities)
- **Integration Testing**: Test Agent + Driver + Engine together
- **E2E Testing**: Test full server-browser flow via Playwright
- **Storybook**: Visual testing for UI components

## Coding Standards

**Language**: Use English for all code comments, logs, error messages, and documentation.

**Naming Conventions**:

- **Classes**: PascalCase with suffixes
  - `*Driver`: Message processors (e.g., `ClaudeSDKDriver`)
  - `*Presenter`: Output handlers (e.g., `ConsolePresenter`)
  - `*Manager`: Lifecycle managers (e.g., `LocalAgentManager`)
  - `*Repository`: Data persistence (e.g., `MemorySessionRepository`)
  - `*Container`: Collection managers (e.g., `MemoryAgentContainer`)

- **Interfaces**: No `I` prefix, use concept names
  - Good: `Agent`, `AgentDriver`, `Session`
  - Bad: `IAgent`, `IAgentDriver`, `ISession`

- **Events**: snake_case type names
  - Stream Layer: `text_delta`, `tool_call`, `message_start`
  - State Layer: `conversation_start`, `tool_executing`
  - Message Layer: `assistant_message`, `tool_call_message`
  - Turn Layer: `turn_request`, `turn_response`

- **Functions**: camelCase with verb prefixes
  - Factory: `create*`, `build*`, `generate*`
  - Functional: `addMessage`, `clearMessages`, `filterEvents`

**File Organization**:

- One type per file (e.g., `AgentInstance.ts`, `Session.ts`)
- Feature-based directories (e.g., `agent/`, `session/`, `mealy/`)
- Barrel exports via `index.ts` in each directory

**OOP Style**: Prefer class-based architecture following Java conventions.

### Logging Standards

**⚠️ CRITICAL: Always use `agentx-common` logger facade, NEVER direct `console.*` calls.**

AgentX uses a SLF4J-style logging facade for unified logging.

**Correct Usage:**

```typescript
// ✅ Correct - Use createLogger()
import { createLogger } from "@agentxjs/common";

const logger = createLogger("engine/AgentEngine");

logger.debug("Processing event", { agentId, eventType });
logger.info("Agent created", { agentId });
logger.warn("Rate limit approaching", { remaining: 10 });
logger.error("Failed to process", { error, agentId });
```

**Incorrect Usage:**

```typescript
// ❌ Wrong - Direct console calls
console.log("Something happened");
console.error("Error:", error);
console.debug("Debug info");
```

**Exceptions Where Console is OK:**

- ✅ Storybook story files (`.stories.tsx`)
- ✅ Test files (`.test.ts`, `.spec.ts`)
- ✅ Build scripts

**Logger Naming Convention:**

- Hierarchical: `"package/feature/Component"`
- Examples: `"engine/mealy/Mealy"`, `"core/agent/AgentInstance"`, `"platform/server/SSEConnection"`
- Use `/` to separate hierarchy levels
- Use PascalCase for component names

**Lazy Initialization:**

Logger creation is safe at module level:

```typescript
// ✅ Safe - logger uses lazy initialization
const logger = createLogger("my/Component");

// Configuration happens later (app entry point)
configure({
  logger: {
    defaultLevel: LogLevel.INFO,
    defaultImplementation: (name) => new ConsoleLogger(name),
  },
});

// Logger will use configuration when first called
```

**Log Levels:**

- `DEBUG` - Detailed flow information (method calls, state changes)
- `INFO` - Important runtime events (initialization, connections, completions)
- `WARN` - Potential issues that don't prevent operation
- `ERROR` - Errors requiring attention

**LOG_LEVEL Environment Variable:**

```bash
LOG_LEVEL=debug  # Show all logs
LOG_LEVEL=info   # Show info, warn, error (default)
LOG_LEVEL=warn   # Show warn, error only
LOG_LEVEL=error  # Show errors only
```

Set in `.env` or `.env.local` for development.

## Environment Variables

The following environment variables are passed to all tasks (via `turbo.json`):

```env
NODE_ENV              # Environment mode
PORT                  # Server port (default: 5200)
ANTHROPIC_API_KEY     # Claude API key (required)
ANTHROPIC_BASE_URL    # API endpoint
PROJECT_PATH          # Project directory mount point
CONTEXT_WINDOW        # Context window size
LOG_LEVEL             # Logging level (debug/info/warn/error)
DATABASE_PATH         # SQLite database path
```

## Docker Deployment

**Image**: `deepracticexs/agent:latest`

**Quick Start:**

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

**Before Creating PR:**

```bash
# Create changeset file directly (interactive CLI not available)
# Create file in .changeset/ directory with format:
# ---
# "@agentxjs/package-name": patch|minor|major
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

### Agent Lifecycle (Docker-Style)

```typescript
import { defineAgent, createAgentX } from "agentxjs";
import { nodeRuntime } from "@agentxjs/node-runtime";

// 1. Define agent template
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are a helpful assistant",
});

// 2. Create platform with runtime
const agentx = createAgentX(nodeRuntime());

// 3. Register definition (auto-creates MetaImage)
agentx.definitions.register(MyAgent);

// 4. Run agent from image
const metaImage = agentx.images.getMetaImage(MyAgent.name);
const agent = await agentx.images.run(metaImage.id);

// 5. Subscribe to events
const unsubscribe = agent.react({
  onTextDelta: (event) => process.stdout.write(event.data.text),
  onAssistantMessage: (event) => console.log(event.data.content),
});

// 6. Send messages
await agent.receive("Hello!");

// 7. Cleanup
unsubscribe();
agentx.agents.destroy(agent.id);
```

### Message Processing Pipeline

```
User: agent.receive("Hello")
  ↓
MiddlewareChain (intercept, modify, or block)
  ↓
Driver.receive(message) → AsyncIterable<StreamEvent>
  ↓
for each StreamEvent:
  ↓
Engine.process(agentId, event) → AgentOutput[]
  ├─ Pass-through original event
  ├─ MessageAssembler: Stream → Message
  ├─ StateEventProcessor: Stream → State
  └─ TurnTracker: Message → Turn
  ↓
InterceptorChain (intercept, modify, or filter)
  ↓
EventBus.emit(output)
  ↓
User subscriptions (onTextDelta, onAssistantMessage, etc.)
```

### Error Handling

AgentX uses unified error taxonomy:

```typescript
interface AgentError {
  category: "system" | "agent" | "llm" | "validation" | "unknown";
  code: string;
  message: string;
  severity: "fatal" | "error" | "warning";
  recoverable: boolean;
  details?: Record<string, unknown>;
}
```

Errors flow through event system as `error_message` events:

```typescript
agent.on("error_message", (event) => {
  console.error(`[${event.data.category}] ${event.data.message}`);
  if (!event.data.recoverable) {
    // Handle fatal error
  }
});
```

### EventBus Architecture

RxJS-based pub/sub with role separation:

```typescript
class AgentEventBus {
  // Producer interface (emit only)
  asProducer(): EventProducer {
    return { emit: (event) => this.subject.next(event) };
  }

  // Consumer interface (subscribe only)
  asConsumer(): EventConsumer {
    return {
      on: (type, handler) => this.on(type, handler),
      once: (type, handler) => this.once(type, handler),
    };
  }
}
```

**Features:**

- Type-safe subscriptions
- Custom filters: `on("text_delta", handler, { filter: (e) => e.data.text.length > 10 })`
- Priority execution: `on("error_message", handler, { priority: 100 })`
- One-time subscriptions: `once("conversation_end", handler)`

### Driver Contract

Drivers must implement:

```typescript
interface AgentDriver {
  // Core method: process message, yield Stream events
  receive(message: UserMessage): AsyncIterable<StreamEventType>;

  // Abort current processing
  abort(): void;

  // Cleanup
  destroy(): Promise<void>;
}
```

**Built-in Drivers:**

- `ClaudeSDKDriver` (`agentx-claude`) - Node.js Claude SDK integration
- `SSEDriver` (`agentx`) - Browser SSE client

### Presenter Contract

Presenters handle side effects:

```typescript
interface AgentPresenter {
  // Present output to external systems
  present(agentId: string, output: AgentOutput): void | Promise<void>;

  // Lifecycle
  initialize?(context: AgentContext): void | Promise<void>;
  destroy?(): void | Promise<void>;
}
```

**Use Cases:**

- Logging: Log events to external system
- Monitoring: Send metrics to monitoring service
- Webhooks: Notify external services of events

## Common Patterns

### Creating an Agent

```typescript
import { defineAgent, createAgentX } from "agentxjs";
import { nodeRuntime } from "@agentxjs/node-runtime";

// 1. Define agent template
const MyAgent = defineAgent({
  name: "Assistant",
  description: "A helpful assistant",
  systemPrompt: "You are a helpful assistant",
});

// 2. Create platform with runtime
const agentx = createAgentX(nodeRuntime());

// 3. Register definition (auto-creates MetaImage)
agentx.definitions.register(MyAgent);

// 4. Run agent from image
const metaImage = agentx.images.getMetaImage(MyAgent.name);
const agent = await agentx.images.run(metaImage.id);

// 5. Use agent
await agent.receive("Hello!");
agentx.agents.destroy(agent.id);
```

### Custom Driver (ADK)

```typescript
import { defineConfig, defineDriver } from "@agentxjs/adk";

// 1. Define config schema
const myDriverConfig = defineConfig({
  apiKey: {
    type: "string",
    description: "API key for my service",
    required: true,
    scope: "instance",
  },
  model: {
    type: "string",
    description: "Model name",
    required: false,
    scope: "definition",
    default: "default-model",
  },
});

// 2. Define driver
export const MyDriver = defineDriver({
  name: "MyDriver",
  description: "My custom driver",
  config: myDriverConfig,

  create: (context) => {
    return {
      name: "MyDriver",

      async *receive(message: UserMessage): AsyncIterable<StreamEventType> {
        const { apiKey, model } = context;

        // Yield Stream events
        yield {
          type: "message_start",
          agentId: context.agentId,
          data: { message: { id: "msg_1", model } },
        };

        yield {
          type: "text_delta",
          agentId: context.agentId,
          data: { text: "Hello" },
        };

        yield {
          type: "message_stop",
          agentId: context.agentId,
          data: { stopReason: "end_turn" },
        };
      },

      async destroy(): Promise<void> {
        // Cleanup
      },
    };
  },
});
```

### Custom Presenter

```typescript
class WebhookPresenter implements AgentPresenter {
  constructor(private webhookUrl: string) {}

  async present(agentId: string, output: AgentOutput): Promise<void> {
    // Only send complete messages
    if (output.type === "assistant_message") {
      await fetch(this.webhookUrl, {
        method: "POST",
        body: JSON.stringify({ agentId, message: output.data }),
      });
    }
  }
}

// Use presenter
const agent = agentx.agents.create(
  defineAgent({
    driver: ClaudeDriver,
    presenters: [new WebhookPresenter("https://example.com/webhook")],
  }),
  { apiKey: "xxx" }
);
```

### Remote Agent (Browser)

```typescript
import { defineAgent, createAgentX } from "agentxjs";
import { sseRuntime } from "agentxjs/client";

// Same agent definition as server
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are helpful",
});

// Create platform with SSE runtime
const runtime = sseRuntime({
  serverUrl: "http://localhost:5200/agentx",
  headers: { Authorization: "Bearer xxx" }, // Optional
});
const agentx = createAgentX(runtime);

// Register and run (same API as server!)
agentx.definitions.register(MyAgent);
const metaImage = agentx.images.getMetaImage(MyAgent.name);
const agent = await agentx.images.run(metaImage.id);

// Use like any agent
agent.react({
  onTextDelta: (event) => setStreamingText(event.data.text),
  onAssistantMessage: (event) => addMessage(event.data),
});

await agent.receive("Hello!");
```

## Troubleshooting

### Build Failures

```bash
# Clear stale artifacts
pnpm clean

# Reinstall
pnpm install

# Build
pnpm build
```

### Type Errors

```bash
# Check all type errors
pnpm typecheck

# Check specific package
pnpm typecheck --filter=@agentxjs/agent
```

### Dependency Issues

Check `turbo.json` task dependencies. Some tasks depend on `^build` (dependencies built first).

### Hot Reload Not Working

In `agentx-web`, ensure both server and client are running:

```bash
pnpm dev --filter=@agentxjs/portagent
```

### SSE Connection Issues

**Browser not receiving events?**

1. Check server is running and accessible
2. Check CORS headers in SSE response
3. Verify SSE connection established: `EventSource.readyState === 1`
4. Check browser DevTools Network tab for SSE events

**Browser receives Stream events but not Message events?**

1. ✅ Check: Is browser's `AgentEngine` initialized?
2. ✅ Check: Is `MessageAssembler` registered?
3. ❌ DO NOT: Try to forward Message events from server

## Related Documentation

- **Main README**: `/README.md` - User-facing documentation
- **Architecture Deep Dive**: `/packages/agentx-engine/ARCHITECTURE.md` - Mealy Machine details
- **Type System**: `/packages/agentx-types/README.md` - Event type hierarchy
- **Docker Guide**: `/docker/agent/README.md` - Deployment details

## Package-Specific Details

### agentx-types

**Purpose**: Foundation type system (140+ files, zero dependencies)

**Key Types:**

- `Agent`, `AgentDriver`, `AgentPresenter` - Core interfaces
- `StreamEventType`, `StateEventType`, `MessageEventType`, `TurnEventType` - Event hierarchy
- `UserMessage`, `AssistantMessage`, `ToolCallMessage`, etc. - Message types
- `AgentError` - Error taxonomy
- ADK type declarations: `defineConfig`, `defineDriver`, `defineAgent`

**Import Pattern:**

```typescript
import type { Agent, StreamEventType } from "@agentxjs/types";
```

### agentx-common

**Purpose**: Internal shared utilities (logger facade)

**Key Features:**

- SLF4J-style logging facade with lazy initialization
- Hierarchical logger naming (`"engine/AgentEngine"`)
- Runtime-injected logger implementations via `setLoggerFactory()`

**Import Pattern:**

```typescript
import { createLogger, setLoggerFactory } from "@agentxjs/common";
```

**Note**: Logger types are declared in `agentx-types`, implementation is in `agentx-common`.

### agentx-engine

**Purpose**: Pure Mealy Machine event processor

**Key Classes:**

- `AgentEngine` - Per-agent Mealy runtime
- `Mealy` - Generic Mealy Machine runtime
- Processors: `messageAssemblerProcessor`, `stateEventProcessor`, `turnTrackerProcessor`

**Import Pattern:**

```typescript
import { AgentEngine } from "@agentxjs/engine";
```

### agentx-agent

**Purpose**: Agent runtime and lifecycle management

**Key Classes:**

- `AgentInstance` - Main agent implementation
- `AgentEventBus` - RxJS-based event system
- `AgentStateMachine` - State transition manager
- `MemoryAgentContainer` - In-memory agent container

**Import Pattern:**

```typescript
import { AgentInstance } from "@agentxjs/agent";
```

### agentx

**Purpose**: Unified platform API with Docker-style lifecycle (local/remote, server/client)

**Key Components:**

- `defineAgent()` - Agent definition factory
- `createAgentX(runtime)` - Platform factory with five managers
- Server: `createAgentXHandler()`, `SSEConnection`, framework adapters
- Client: `sseRuntime()`, `SSEDriver`, `RemoteContainer`, `RemoteRepository`

**AgentX Interface:**

```typescript
interface AgentX {
  readonly runtime: Runtime;
  readonly definitions: DefinitionManager; // Register agent templates
  readonly images: ImageManager; // Build/manage snapshots
  readonly agents: AgentManager; // Query running agents
  readonly sessions: SessionManager; // User-facing sessions
  readonly errors: ErrorManager; // Error handling
}
```

**Import Pattern:**

```typescript
// Core API
import { defineAgent, createAgentX } from "agentxjs";

// Browser runtime
import { sseRuntime } from "agentxjs/client";

// Server handler
import { createAgentXHandler } from "agentxjs/server";
import { toHonoHandler } from "agentxjs/server/adapters/hono";
```

**Docker-Style Lifecycle:**

```
Definition → register → MetaImage → run → Agent → Session
```

**Key Principle**: AgentManager only queries. Creation happens via `images.run()` or `sessions.create()`.

### agentx-runtime

**Purpose**: Node.js runtime - Claude driver, SQLite persistence, FileLogger

**Key Exports:**

- `runtime` - Pre-configured NodeRuntime instance
- `NodeRuntime` - Node.js runtime class (Container, SQLite Repository, FileLogger)
- `ClaudeDriver` - Claude SDK driver

**Import Pattern:**

```typescript
import { runtime } from "@agentxjs/node-runtime";

// Or access components directly
import { NodeRuntime, ClaudeDriver } from "@agentxjs/node-runtime";
```

**Data Storage**: `~/.agentx/` directory

- `~/.agentx/data/agentx.db` - SQLite database
- `~/.agentx/logs/agentx.log` - Log files (with rotation)

### agentx-ui

**Purpose**: React component library with Tailwind v4

**Key Components:**

- Workspace: `<Workspace>` - Complete chat interface with session management
- Messages: `<UserMessage>`, `<AssistantMessage>`, `<ToolCallMessage>`
- Parts: `<TextContent>`, `<ImageContent>`, `<ToolCallContent>`

**Import Pattern:**

```typescript
import { Workspace, UserMessage } from "@agentxjs/ui";
import "@agentxjs/ui/globals.css"; // Required for styles
```

**Tailwind v4**: Uses CSS-first configuration with `@theme` directive. Design tokens in `src/styles/globals.css`.

## Apps

### portagent

**Purpose**: AgentX Portal - Production-ready web application with authentication

**Tech Stack:**

- **Server**: Hono + JWT authentication (port 5200)
- **Client**: React + Vite + Tailwind v4 (port 5173 in dev)
- **UI**: Uses `@agentxjs/ui` Workspace component

**Key Files:**

- `src/server/index.ts` - Hono server with AgentX API
- `src/server/auth.ts` - JWT authentication
- `src/client/pages/ChatPage.tsx` - Main chat interface
- `src/client/styles/globals.css` - Tailwind v4 design tokens

**Environment Variables:**

```env
PORTAGENT_PASSWORD    # Login password (or auto-generated)
LLM_PROVIDER_KEY      # Claude API key
```

## Summary

**AgentX Architecture Principles:**

1. **Docker-Style Lifecycle**: Definition → Image → Agent → Session
2. **Five Manager Pattern**: definitions, images, agents, sessions, errors
3. **Mealy Machines**: Pure event processing with "state is means, output is goal"
4. **4-Layer Events**: Stream → State → Message → Turn
5. **Agent-as-Driver**: Unlimited composition via shared interface
6. **Stream-Only SSE**: Server forwards Stream events, browser reassembles
7. **Event-Driven**: All communication via RxJS EventBus
8. **Type-Safe**: 140+ TypeScript definitions
9. **Cross-Platform**: Same API works in Node.js and browser

**Package Dependency Flow:**

```
types → common → engine → agent → agentx → node-runtime → ui
                                      ↘
                                    portagent (app)
```

**Critical Design Decisions:**

- ✅ **Docker-style layered architecture** (Definition → Image → Agent)
- ✅ **AgentManager only queries** (creation via images.run() or sessions.create())
- ✅ **Server forwards Stream events only** (NOT assembled messages)
- ✅ **Browser has full AgentEngine** (complete reassembly)
- ✅ **RemoteRepository noop for saveMessage** (server persists via SessionCollector)
- ✅ **State is implementation detail** (Mealy philosophy)
- ✅ **Errors flow through event system** (ErrorManager + error_message events)
- ✅ **Logger facade with lazy initialization** (agentx-common)
- ✅ **Runtime abstraction** (nodeRuntime, sseRuntime)
- ✅ **Tailwind v4 CSS-first** (design tokens via @theme)
