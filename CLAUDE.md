# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Deepractice Agent (AgentX)** - Event-driven AI Agent framework with cross-platform support. A TypeScript monorepo providing both Node.js and browser-based AI agent capabilities powered by Claude.

**Key Value Proposition**: Production-ready agent framework with Mealy Machine architecture, 4-layer event system, and seamless server-browser communication.

## Repository Structure

This is a **pnpm monorepo** with Turborepo build orchestration:

```
/AgentX
└── packages/
    ├── agentx-types/     # Type definitions (140+ files, zero dependencies)
    ├── agentx-adk/       # Agent Development Kit (defineConfig, defineDriver, defineAgent)
    ├── agentx-logger/    # SLF4J-style logging facade
    ├── agentx-engine/    # Mealy Machine event processor
    ├── agentx-agent/     # Agent runtime
    ├── agentx/           # Platform API (local/remote, server/client)
    ├── agentx-claude/    # Claude SDK driver integration
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
agentx-types (140+ type definitions, ADK type declarations)
    ↓
agentx-adk (Agent Development Kit - defineConfig, defineDriver, defineAgent)
    ↓
agentx-logger (SLF4J-style facade)
    ↓
agentx-engine (Mealy Machine processors)
    ↓
agentx-agent (Agent runtime)
    ↓
agentx (Platform API: local/remote, server/client)
    ↓
agentx-claude (Claude SDK driver, Node.js only)
    ↓
agentx-ui (React components)
```

**Layer Responsibilities:**

| Layer        | Package         | Responsibility                                              |
| ------------ | --------------- | ----------------------------------------------------------- |
| **Types**    | `agentx-types`  | Pure type definitions, ADK type declarations                |
| **ADK**      | `agentx-adk`    | Development tools (defineConfig, defineDriver, defineAgent) |
| **Logger**   | `agentx-logger` | Logging facade with lazy initialization                     |
| **Engine**   | `agentx-engine` | Pure event processing (Mealy Machines)                      |
| **Agent**    | `agentx-agent`  | Agent runtime, EventBus, lifecycle management               |
| **Platform** | `agentx`        | Unified API, SSE server/client                              |
| **Driver**   | `agentx-claude` | Claude SDK integration                                      |
| **UI**       | `agentx-ui`     | React components, Storybook                                 |

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
- Framework adapters: `expressAdapter()`, `honoAdapter()`, `nextAdapter()`

**Browser Side** (`agentx` package):

- `SSEDriver` - EventSource-based driver for browser
- `createRemoteAgent()` - Helper to connect to remote server
- Full `AgentEngine` runs in browser (reassembles all events)

#### SSE API Endpoints

| Method | Path                    | Description                          |
| ------ | ----------------------- | ------------------------------------ |
| GET    | `/info`                 | Platform info (version, agent count) |
| GET    | `/health`               | Health check                         |
| GET    | `/agents`               | List all agents                      |
| POST   | `/agents`               | Create agent (if creation enabled)   |
| GET    | `/agents/:id`           | Get agent info                       |
| DELETE | `/agents/:id`           | Destroy agent                        |
| GET    | `/agents/:id/sse`       | SSE connection (EventSource)         |
| POST   | `/agents/:id/messages`  | Send message to agent                |
| POST   | `/agents/:id/interrupt` | Interrupt agent processing           |

**Correct Usage Flow:**

```typescript
// 1. Create agent (server-side or via API)
const agent = agentx.agents.create(ClaudeAgent, { apiKey: "xxx" });

// 2. Browser connects to SSE
const sseUrl = `${serverUrl}/agents/${agentId}/sse`;
const eventSource = new EventSource(sseUrl);

// 3. Browser creates SSEDriver + AgentInstance
const driver = new SSEDriver({ serverUrl, agentId });
const browserAgent = new AgentInstance(definition, context, engine);

// 4. User sends message (browser)
await browserAgent.receive("Hello!");

// 5. SSEDriver posts to server
await fetch(`${serverUrl}/agents/${agentId}/messages`, {
  method: "POST",
  body: JSON.stringify({ content: "Hello!" }),
});

// 6. Server processes, forwards Stream Events via SSE
// 7. Browser receives, reassembles Message/State/Turn events
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

1. **Always build dependencies first**: If you modify `agentx-agent`, run `pnpm build --filter=@deepractice-ai/agentx-agent` before working with packages that depend on it.

2. **Use workspace references**: Packages use `"workspace:*"` protocol. Never use file paths.

3. **Path aliases**:
   - `~` - Internal package imports (e.g., `~/agent`, `~/session`)
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

**⚠️ CRITICAL: Always use `agentx-logger` facade, NEVER direct `console.*` calls.**

AgentX uses a SLF4J-style logging facade for unified logging.

**Correct Usage:**

```typescript
// ✅ Correct - Use createLogger()
import { createLogger } from "@deepractice-ai/agentx-logger";

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

### Agent Lifecycle

```typescript
// 1. Create agent
const agent = agentx.agents.create(ClaudeAgent, { apiKey: "xxx" });

// 2. Initialize (if needed)
await agent.initialize?.();

// 3. Subscribe to events
const unsubscribe = agent.react({
  onTextDelta: (event) => process.stdout.write(event.data.text),
  onAssistantMessage: (event) => console.log(event.data.content),
});

// 4. Send messages
await agent.receive("Hello!");

// 5. Cleanup
unsubscribe();
await agent.destroy();
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
import { createAgentX } from "@deepractice-ai/agentx";
import { defineAgent } from "@deepractice-ai/agentx-adk";
import { ClaudeDriver } from "@deepractice-ai/agentx-claude";

// Create AgentX platform
const agentx = createAgentX();

// Define agent using ADK
const ClaudeAgent = defineAgent({
  name: "ClaudeAssistant",
  driver: ClaudeDriver,
});

// Create agent instance
const agent = agentx.agents.create(ClaudeAgent, {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-20250514",
});

// Use agent
await agent.receive("Hello!");
await agent.destroy();
```

### Custom Driver (ADK)

```typescript
import { defineConfig, defineDriver } from "@deepractice-ai/agentx-adk";

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
import { createRemoteAgent } from "@deepractice-ai/agentx";

// Create remote agent (connects to server)
const agent = createRemoteAgent("http://localhost:5200/agentx", agentId);

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
pnpm typecheck --filter=@deepractice-ai/agentx-agent
```

### Dependency Issues

Check `turbo.json` task dependencies. Some tasks depend on `^build` (dependencies built first).

### Hot Reload Not Working

In `agentx-web`, ensure both server and client are running:

```bash
pnpm dev --filter=@deepractice-ai/agentx-web
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
import type { Agent, StreamEventType } from "@deepractice-ai/agentx-types";
```

### agentx-adk

**Purpose**: Agent Development Kit - Development-time tools for Driver and Agent developers

**Key Functions:**

- `defineConfig(schema)` - Define reusable config schema with validation
- `defineDriver(input)` - Create type-safe Driver with config schema
- `defineAgent(input)` - Create Agent definition with type inference

**Three-Layer Pattern:**

```typescript
// 1. Define config schema
const myConfig = defineConfig({
  apiKey: { type: "string", required: true, scope: "instance" },
  model: { type: "string", required: false, scope: "definition", default: "gpt-4" },
});

// 2. Define driver with schema
export const MyDriver = defineDriver({
  name: "MyDriver",
  config: myConfig,
  create: (context) => ({
    /* driver implementation */
  }),
});

// 3. Define agent using driver
export const MyAgent = defineAgent({
  name: "MyAgent",
  driver: MyDriver, // Type-safe! Config inferred from MyDriver.schema
});
```

**Import Pattern:**

```typescript
import { defineConfig, defineDriver, defineAgent } from "@deepractice-ai/agentx-adk";
```

**Who Uses This:**

- Driver developers (creating new drivers like ClaudeDriver, OpenAIDriver)
- Application developers (defining custom agents with specific configs)

### agentx-logger

**Purpose**: SLF4J-style logging facade

**Key Features:**

- Lazy initialization (safe at module level)
- Hierarchical naming (`"engine/AgentEngine"`)
- Multiple implementations (Console, WebSocket, custom)

**Import Pattern:**

```typescript
import { createLogger } from "@deepractice-ai/agentx-logger";
```

### agentx-engine

**Purpose**: Pure Mealy Machine event processor

**Key Classes:**

- `AgentEngine` - Per-agent Mealy runtime
- `Mealy` - Generic Mealy Machine runtime
- Processors: `messageAssemblerProcessor`, `stateEventProcessor`, `turnTrackerProcessor`

**Import Pattern:**

```typescript
import { AgentEngine } from "@deepractice-ai/agentx-engine";
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
import { AgentInstance } from "@deepractice-ai/agentx-agent";
```

### agentx

**Purpose**: Unified platform API (local/remote, server/client)

**Key Components:**

- `createAgentX()` - Platform factory
- Server: `createAgentXHandler()`, `SSEConnection`
- Client: `SSEDriver`, `createRemoteAgent()`

**Import Pattern:**

```typescript
import { createAgentX } from "@deepractice-ai/agentx";
import { createRemoteAgent } from "@deepractice-ai/agentx/client";
```

**Note**: `defineAgent()` has been moved to `agentx-adk` package.

### agentx-claude

**Purpose**: Claude SDK driver integration (Node.js only)

**Key Exports:**

- `ClaudeDriver` - ADK-based driver (recommended)
- `ClaudeSDKDriver` - Legacy class-based driver (backward compatibility)
- `claudeConfig` - Config schema for Claude driver

**Import Pattern:**

```typescript
import { ClaudeDriver } from "@deepractice-ai/agentx-claude";

// Legacy (backward compatibility)
import { ClaudeSDKDriver } from "@deepractice-ai/agentx-claude";
```

### agentx-ui

**Purpose**: React component library

**Key Components:**

- Chat: `<Chat>`, `<ChatInput>`, `<ChatMessageList>`
- Messages: `<UserMessage>`, `<AssistantMessage>`, `<ToolCallMessage>`
- Parts: `<TextContent>`, `<ImageContent>`, `<ToolCallContent>`

**Import Pattern:**

```typescript
import { Chat, UserMessage } from "@deepractice-ai/agentx-ui";
```

## Summary

**AgentX Architecture Principles:**

1. **Mealy Machines**: Pure event processing with "state is means, output is goal"
2. **4-Layer Events**: Stream → State → Message → Turn
3. **Agent-as-Driver**: Unlimited composition via shared interface
4. **Stream-Only SSE**: Server forwards Stream events, browser reassembles
5. **Event-Driven**: All communication via RxJS EventBus
6. **Type-Safe**: 140+ TypeScript definitions
7. **Cross-Platform**: Same API works in Node.js and browser

**Package Dependency Flow:**

```
types → adk → logger → engine → agent → agentx → claude → ui
```

**Critical Design Decisions:**

- ✅ **ADK Pattern**: Development tools (adk) separate from runtime (agentx)
- ✅ **Server forwards Stream events only** (NOT assembled messages)
- ✅ **Browser has full AgentEngine** (complete reassembly)
- ✅ **State is implementation detail** (Mealy philosophy)
- ✅ **Errors flow through event system** (not just exceptions)
- ✅ **Logger facade with lazy initialization**
- ✅ **defineConfig → defineDriver → defineAgent** (three-layer pattern)
