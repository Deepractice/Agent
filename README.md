<div align="center">
  <h1>AgentX · Agent Runtime, Docker Style</h1>
  <p>
    <strong>Manage AI Agents like containers - commit, resume, fork your conversations</strong>
  </p>
  <p>
    <strong>Key Features:</strong> Docker-style Lifecycle | 4-Layer Event System | Isomorphic Architecture
  </p>

  <hr/>

  <p>
    <a href="https://github.com/Deepractice/Agent"><img src="https://img.shields.io/github/stars/Deepractice/Agent?style=social" alt="Stars"/></a>
    <img src="https://komarev.com/ghpvc/?username=Agent&label=views&color=0e75b6&style=flat&abbreviated=true" alt="Views"/>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Deepractice/Agent?color=blue" alt="License"/></a>
    <a href="https://www.npmjs.com/package/@deepractice-ai/agentx"><img src="https://img.shields.io/npm/v/@deepractice-ai/agentx?color=cb3837&logo=npm" alt="npm"/></a>
  </p>

  <p>
    <a href="README.md"><strong>English</strong></a> |
    <a href="README.zh-CN.md">简体中文</a>
  </p>
</div>

---

## What is AgentX?

AgentX is an **AI Agent runtime framework** that brings Docker-style lifecycle management to AI Agents.

```typescript
import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
import { runtime } from "@deepractice-ai/agentx-node";

// 1. Define your agent (like Dockerfile)
const TranslatorAgent = defineAgent({
  name: "Translator",
  systemPrompt: "You are a professional translator.",
});

// 2. Create platform with runtime
const agentx = createAgentX(runtime);

// 3. Register and run
agentx.definitions.register(TranslatorAgent);
const image = await agentx.images.getMetaImage("Translator");
const session = await agentx.sessions.create(image.imageId, "user-1");
const agent = await session.resume();

// 4. Subscribe to events and chat
agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onAssistantMessage: (e) => console.log("\n[Done]"),
});

await agent.receive("Translate 'Hello' to Japanese");
```

---

## Why AgentX?

| Challenge                      | AgentX Solution                                              |
| ------------------------------ | ------------------------------------------------------------ |
| Agent state is ephemeral       | **Docker-style Images** - commit, resume, fork conversations |
| Server/Browser code differs    | **Isomorphic Architecture** - same API everywhere            |
| Hard to track streaming events | **4-Layer Event System** - Stream, State, Message, Turn      |
| Complex async state management | **Mealy Machine** - pure functional event processing         |

---

## Core Concepts

### Docker-Style Lifecycle

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

Each layer serves different consumers:

| Layer   | Consumer      | Use Case                              |
| ------- | ------------- | ------------------------------------- |
| Stream  | UI            | Typewriter effect, real-time display  |
| State   | State machine | Loading indicators, progress tracking |
| Message | Chat history  | Persistence, conversation display     |
| Turn    | Analytics     | Billing, usage metrics, performance   |

### Isomorphic Architecture

Same business code runs on Server and Browser:

```
┌─────────────────────────────────────────────────────────┐
│              Application Code (identical)                │
│   const agentx = createAgentX(runtime);                 │
│   agentx.definitions.register(MyAgent);                 │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   Server Runtime    │       │   Browser Runtime   │
│   SQLiteRepository  │       │   RemoteRepository  │
│   ClaudeDriver      │       │   SSEDriver         │
└─────────────────────┘       └─────────────────────┘
```

---

## Installation

```bash
# Core framework
npm install @deepractice-ai/agentx

# Node.js runtime (Server)
npm install @deepractice-ai/agentx-node

# React UI components (optional)
npm install @deepractice-ai/agentx-ui
```

---

## Quick Start

### Basic Usage (Node.js)

```typescript
import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
import { runtime } from "@deepractice-ai/agentx-node";

const agentx = createAgentX(runtime);

// Define and register agent
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are a helpful assistant.",
});
agentx.definitions.register(MyAgent);

// Create session and start chatting
const image = await agentx.images.getMetaImage("Assistant");
const session = await agentx.sessions.create(image.imageId, "user-1");
const agent = await session.resume();

// React-style event subscription
agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onToolCall: (e) => console.log(`Tool: ${e.data.name}`),
  onError: (e) => console.error(e.data.message),
});

await agent.receive("Hello!");

// Save conversation state
await session.commit();
```

### Event Subscription Patterns

```typescript
// Pattern 1: React-style (recommended)
agent.react({
  onTextDelta: (e) => {},
  onAssistantMessage: (e) => {},
  onToolCall: (e) => {},
});

// Pattern 2: Type-safe single event
agent.on("text_delta", (e) => {
  console.log(e.data.text); // TypeScript knows the type
});

// Pattern 3: Batch subscription
agent.on({
  text_delta: (e) => {},
  assistant_message: (e) => {},
  error: (e) => {},
});

// Pattern 4: All events
agent.on((event) => {
  console.log(event.type, event.data);
});
```

### Session Management

```typescript
// Resume from previous session
const session = await agentx.sessions.get(sessionId);
const agent = await session.resume();

// Fork conversation (branch)
const forkedSession = await session.fork();
const forkedAgent = await forkedSession.resume();

// List user's sessions
const sessions = await agentx.sessions.list({ userId: "user-1" });
```

### Browser Integration (SSE)

```typescript
// Browser client connects to AgentX server
import { createAgentX } from "@deepractice-ai/agentx";
import { sseRuntime } from "@deepractice-ai/agentx/browser";

const agentx = createAgentX(
  sseRuntime({
    serverUrl: "http://localhost:5200",
  })
);

// Same API as server!
const session = await agentx.sessions.create(imageId, userId);
const agent = await session.resume();

agent.react({
  onTextDelta: (e) => setStreamingText((prev) => prev + e.data.text),
  onAssistantMessage: (e) => setMessages((prev) => [...prev, e.data]),
});
```

---

## Packages

| Package                         | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| `@deepractice-ai/agentx-types`  | Type definitions (140+ files, zero dependencies)  |
| `@deepractice-ai/agentx-adk`    | Agent Development Kit (defineAgent, defineDriver) |
| `@deepractice-ai/agentx-logger` | SLF4J-style logging facade                        |
| `@deepractice-ai/agentx-engine` | Mealy Machine event processor                     |
| `@deepractice-ai/agentx-agent`  | Agent runtime core                                |
| `@deepractice-ai/agentx`        | Platform API (unified entry point)                |
| `@deepractice-ai/agentx-node`   | Node.js runtime (Claude driver, SQLite)           |
| `@deepractice-ai/agentx-ui`     | React UI components                               |

---

## Try It Now (Docker)

Want to see AgentX in action? Run the demo:

```bash
docker run -d \
  --name agentx \
  -p 5200:5200 \
  -e ANTHROPIC_API_KEY=sk-ant-xxxxx \
  deepracticexs/agent:latest
```

Open http://localhost:5200 - full-featured AI Agent with visual interface.

---

## Documentation

- **[Architecture Guide](./CLAUDE.md)** - Deep dive into system design
- **[API Reference](./packages/agentx/README.md)** - Platform API documentation
- **[Type System](./packages/agentx-types/README.md)** - Complete type definitions

---

## Roadmap

- [x] Docker-style lifecycle (Definition → Image → Session)
- [x] 4-layer event system
- [x] Server/Browser isomorphic architecture
- [x] Claude driver
- [ ] OpenAI driver
- [ ] Local LLM support (Ollama)
- [ ] Multi-agent orchestration
- [ ] Plugin system

---

## Contributing

```bash
# Clone and install
git clone https://github.com/Deepractice/Agent.git
cd Agent
pnpm install

# Development
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT - see [LICENSE](./LICENSE)

---

<div align="center">
  <p>
    Built with care by <a href="https://github.com/Deepractice">Deepractice</a>
  </p>
  <p>
    <strong>Making AI Agent Development Simple</strong>
  </p>
</div>
