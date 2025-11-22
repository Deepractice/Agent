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

AgentX 使用 **Stream Events 转发 + 客户端重组装** 的架构，实现服务器和浏览器之间的高效通信。

#### 核心设计理念

**关键原则**: 服务器只转发 Stream Layer 事件，浏览器端完整的 AgentEngine 会自动重新组装出 Message/State/Turn Layer 事件。

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Server (Node.js)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ClaudeSDKDriver                                                     │
│       ↓ (yields Stream Events)                                       │
│  AgentDriverBridge ───→ EventBus                                     │
│       ↓                     ↓                                        │
│  [AgentMessageAssembler]   [AgentStateMachine]   [AgentTurnTracker] │
│   (服务器端本地使用)        (服务器端本地使用)     (服务器端本地使用)   │
│       ↓                     ↓                         ↓              │
│  assistant_message    conversation_active        turn_complete       │
│  tool_use_message     tool_executing             ...                 │
│       ↓                     ↓                         ↓              │
│  SSEReactor (⚠️ 只订阅 Stream Events!)                               │
│       ↓                                                              │
│  转发: message_start, text_delta, tool_use_content_block_start, ...  │
│       ↓                                                              │
│  SimpleSSESession → HTTP Response Stream                             │
│       ↓                                                              │
└───────┼──────────────────────────────────────────────────────────────┘
        │ SSE (Server-Sent Events)
        │ 只传输 Stream Events (高效，低带宽)
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (Web)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  EventSource.onmessage                                               │
│       ↓                                                              │
│  SSEDriver (receives Stream Events)                                  │
│       ↓ (yields to AgentEngine)                                      │
│  AgentEngine (完整引擎，自动注册所有 Reactors)                         │
│       ↓                                                              │
│  EventBus (浏览器端)                                                  │
│       ↓                                                              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ AgentMessageAssembler (浏览器端，自动注册)                    │     │
│  │  - 订阅 Stream Events                                       │     │
│  │  - 组装 Message Layer:                                      │     │
│  │    * assistant_message (从 text_delta 组装)                 │     │
│  │    * tool_use_message (从 tool_use_content_block_* 组装)    │     │
│  │    * error_message                                          │     │
│  └────────────────────────────────────────────────────────────┘     │
│       ↓                                                              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ AgentStateMachine (浏览器端，自动注册)                        │     │
│  │  - 订阅 Stream Events                                       │     │
│  │  - 组装 State Layer:                                        │     │
│  │    * conversation_active, responding, tool_executing, ...   │     │
│  └────────────────────────────────────────────────────────────┘     │
│       ↓                                                              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ AgentTurnTracker (浏览器端，自动注册)                         │     │
│  │  - 订阅 Message Events                                      │     │
│  │  - 组装 Turn Layer: cost, tokens, duration                  │     │
│  └────────────────────────────────────────────────────────────┘     │
│       ↓                                                              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ UIReactor (用户注册)                                         │     │
│  │  - 订阅 Message Events:                                     │     │
│  │    * onAssistantMessage → setMessages()                     │     │
│  │    * onToolUseMessage → setMessages()                       │     │
│  │    * onTextDelta → setStreaming()                           │     │
│  │    * onErrorMessage → setErrors()                           │     │
│  └────────────────────────────────────────────────────────────┘     │
│       ↓                                                              │
│  React State Update → UI Render                                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

#### 为什么这样设计？

1. **高效传输**: 只传输增量的 Stream Events，避免传输完整组装后的消息（减少带宽）
2. **解耦合**: 服务器不需要知道客户端如何使用这些事件
3. **灵活性**: 不同客户端（Web、移动端）可以用不同方式组装和展示
4. **一致性**: 服务器端和浏览器端使用相同的 agentx-core 引擎，保证行为一致

#### 事件流详解

**Stream Layer Events** (通过 SSE 传输):
- `message_start` - 开始处理消息
- `text_delta` - 文本增量片段
- `text_content_block_start/stop` - 文本块生命周期
- `tool_use_content_block_start` - Claude 决定调用工具
- `input_json_delta` - 工具参数 JSON 增量
- `tool_use_content_block_stop` - 工具参数接收完成
- `tool_call` - 工具调用事件（完整参数）
- `tool_result` - 工具执行结果
- `message_stop` - 消息处理完成

**Message Layer Events** (浏览器端组装，不通过 SSE):
- `assistant_message` - 完整的 AI 回复消息
- `tool_use_message` - 完整的工具使用记录（toolCall + toolResult）
- `error_message` - 错误消息

**State Layer Events** (浏览器端组装，不通过 SSE):
- `conversation_active` - 对话活跃
- `responding` - AI 正在回复
- `tool_executing` - 工具正在执行

**Turn Layer Events** (浏览器端组装，不通过 SSE):
- `turn_complete` - 包含 cost, tokens, duration 等分析数据

#### 关键组件

**服务器端**:
- `SSEServer` (`packages/agentx-framework/src/server/SSEServer.ts`) - HTTP + SSE 服务器
- `SSEReactor` (`packages/agentx-framework/src/server/SSEReactor.ts`) - 只转发 Stream Events
- `SimpleSSESession` - 原生 SSE 实现，无外部依赖

**浏览器端**:
- `SSEDriver` (`packages/agentx-framework/src/browser/SSEDriver.ts`) - 接收 SSE，使用 EventSource API
- `SSEAgent` (`packages/agentx-framework/src/browser/SSEAgent.ts`) - 预配置的浏览器端 Agent
- `AgentEngine` - 自动注册 MessageAssembler、StateMachine、TurnTracker
- `UIReactor` (`packages/agentx-ui/src/components/agent/UIReactor.ts`) - UI 数据绑定

#### 重要提醒

**⚠️ 不要修改 SSEReactor 去转发 Message Layer 事件！**

这是常见的误解。SSEReactor 的设计就是只转发 Stream Events。如果发现浏览器端没有收到 Message Events：

1. ✅ 检查浏览器端是否正确接收了 Stream Events
2. ✅ 检查浏览器端 AgentEngine 是否正确初始化
3. ✅ 检查浏览器端 AgentMessageAssembler 是否正确订阅和组装
4. ❌ 不要在服务器端转发已组装的 Message Events

这种架构确保了服务器和浏览器之间的清晰职责分离。

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
