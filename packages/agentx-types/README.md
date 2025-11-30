# @deepractice-ai/agentx-types

> Core type definitions for the Deepractice AgentX ecosystem

## Overview

`agentx-types` is a **pure TypeScript type library** (140+ files, zero dependencies) that defines the complete type system for building event-driven AI agents.

**Key Characteristics:**

- **Zero runtime dependencies** - Pure TypeScript types (except type guards)
- **Platform-agnostic** - Works in Node.js, Browser, and Edge runtimes
- **Contract-first design** - Single source of truth for data structures
- **4-Layer Event Architecture** - Stream → State → Message → Turn
- **"Define Once, Run Anywhere"** - Unified agent definition across platforms
- **Well-documented** - Every type includes JSDoc comments with design decisions

## Installation

```bash
pnpm add @deepractice-ai/agentx-types
```

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        agentx-types (140+ files)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   agent/    │  │   event/    │  │  message/   │  │   llm/    │  │
│  │  14 files   │  │  44 files   │  │  13 files   │  │  7 files  │  │
│  │             │  │             │  │             │  │           │  │
│  │ Agent       │  │ 4-Layer     │  │ Message     │  │ LLM       │  │
│  │ Driver      │  │ Events      │  │ Content     │  │ Config    │  │
│  │ Presenter   │  │             │  │ Parts       │  │ Request   │  │
│  │ Definition  │  │             │  │             │  │ Response  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   agentx/   │  │  runtime/   │  │    mcp/     │  │  error/   │  │
│  │  13 files   │  │  15+ files  │  │   7 files   │  │  7 files  │  │
│  │             │  │             │  │             │  │           │  │
│  │ Platform    │  │ Runtime     │  │ Tool        │  │ AgentError│  │
│  │ Manager     │  │ Container   │  │ Resource    │  │ Category  │  │
│  │ defineAgent │  │ Sandbox     │  │ Prompt      │  │ Severity  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  session/   │  │   logger/   │  │   guards/   │                 │
│  │   2 files   │  │   4 files   │  │   3 files   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Reference

### Core Contracts (`agent/`)

Agent runtime interfaces - the core contracts for building agents.

| Type               | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `Agent`            | Agent instance interface (receive, on, react, destroy) |
| `AgentDriver`      | Message processor contract (receive → StreamEvent)     |
| `AgentPresenter`   | Side-effect handler (logging, monitoring, webhooks)    |
| `AgentMiddleware`  | Incoming message interceptor (before driver)           |
| `AgentInterceptor` | Outgoing event interceptor (after engine)              |
| `AgentContext`     | Runtime context (agentId, config, session)             |
| `AgentDefinition`  | Agent template (name, description, systemPrompt)       |
| `AgentContainer`   | Agent instance storage                                 |

```typescript
import type { Agent, AgentDriver, AgentPresenter } from "@deepractice-ai/agentx-types";

// Driver: Process messages, yield stream events
interface AgentDriver {
  receive(message: UserMessage): AsyncIterable<StreamEventType>;
  abort(): void;
  destroy(): Promise<void>;
}

// Agent: High-level interface
interface Agent {
  readonly id: string;
  receive(input: string | UserMessage): Promise<void>;
  on<T extends AgentEventType["type"]>(type: T, handler: Handler<T>): Unsubscribe;
  react(handlers: EventHandlers): Unsubscribe;
  destroy(): Promise<void>;
}
```

---

### Event System (`event/`) - 4-Layer Architecture

The heart of AgentX - a hierarchical event system for real-time AI interactions.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Event Flow                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Driver.receive()                                                   │
│       │                                                             │
│       ▼ yields                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L1: Stream Layer (real-time, incremental)                   │   │
│  │ message_start → text_delta* → tool_call → message_stop      │   │
│  └────────────────────────────┬────────────────────────────────┘   │
│                               │ Mealy Machine assembles             │
│                               ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L2: State Layer (state transitions)                         │   │
│  │ conversation_start → thinking → responding → conversation_end│   │
│  └────────────────────────────┬────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L3: Message Layer (complete messages)                       │   │
│  │ user_message, assistant_message, tool_call_message          │   │
│  └────────────────────────────┬────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L4: Turn Layer (analytics)                                  │   │
│  │ turn_request → turn_response (duration, cost, tokens)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Design Decision: Why 4 Layers?

Each layer serves a different consumer:

| Layer       | Consumer                          | Purpose                         |
| ----------- | --------------------------------- | ------------------------------- |
| **Stream**  | UI (typewriter effect)            | Real-time incremental updates   |
| **State**   | State machine, loading indicators | Track agent lifecycle           |
| **Message** | Chat history, persistence         | Complete conversation records   |
| **Turn**    | Analytics, billing                | Usage metrics and cost tracking |

#### Stream Layer Events (L1)

Real-time incremental events during streaming response.

```typescript
import type {
  StreamEventType,
  TextDeltaEvent,
  ToolCallEvent,
  MessageStopEvent,
} from "@deepractice-ai/agentx-types";

// Text streaming flow
// 1. MessageStartEvent
// 2. TextContentBlockStartEvent
// 3. TextDeltaEvent (repeated) ← append to build complete text
// 4. TextContentBlockStopEvent
// 5. MessageDeltaEvent
// 6. MessageStopEvent

// Tool use flow
// 1. MessageStartEvent
// 2. ToolUseContentBlockStartEvent
// 3. InputJsonDeltaEvent (repeated) ← concatenate to build JSON
// 4. ToolUseContentBlockStopEvent
// 5. ToolCallEvent ← complete tool call ready
// 6. ToolResultEvent ← after execution
```

#### State Layer Events (L2)

State machine transitions for agent lifecycle.

```typescript
import type {
  StateEventType,
  ConversationStartStateEvent,
  ToolPlannedStateEvent,
  ConversationEndStateEvent,
} from "@deepractice-ai/agentx-types";

// Agent lifecycle: agent_initializing → agent_ready → agent_destroyed
// Conversation: conversation_queued → conversation_start → conversation_thinking
//               → conversation_responding → conversation_end
// Tool: tool_planned → tool_executing → tool_completed/tool_failed
```

#### Message Layer Events (L3)

Complete message events for chat history.

```typescript
import type {
  MessageEventType,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolCallMessageEvent,
} from "@deepractice-ai/agentx-types";

// UserMessageEvent - user sent a message
// AssistantMessageEvent - AI completed a response
// ToolCallMessageEvent - AI requested tool execution
// ToolResultMessageEvent - tool execution completed
```

#### Turn Layer Events (L4)

Analytics events for complete request-response cycles.

```typescript
import type { TurnRequestEvent, TurnResponseEvent } from "@deepractice-ai/agentx-types";

interface TurnResponseEvent {
  type: "turn_response";
  turnId: string;
  data: {
    assistantMessage: AssistantMessage;
    durationMs: number;
    usage?: { input: number; output: number };
    costUsd?: number;
  };
}
```

#### Design Decision: ErrorEvent is Independent

Error is NOT part of Message or the 4-layer hierarchy because:

1. **Not conversation content** - Errors are system notifications
2. **SSE transport** - Errors need special handling for transmission
3. **UI-specific rendering** - Error display differs from messages

```typescript
import type { ErrorEvent } from "@deepractice-ai/agentx-types";

// ErrorEvent travels via SSE alongside StreamEvents
// Browser receives and displays error UI
```

---

### Message Types (`message/`)

Role-based message system with multi-modal content support.

```typescript
import type {
  Message,
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
} from "@deepractice-ai/agentx-types";

// Discriminated union by `subtype` field
type Message =
  | UserMessage // subtype: "user"
  | AssistantMessage // subtype: "assistant"
  | SystemMessage // subtype: "system"
  | ToolCallMessage // subtype: "tool-call"
  | ToolResultMessage; // subtype: "tool-result"
```

#### Content Parts

Multi-modal content through `ContentPart` types:

```typescript
import type { ContentPart, TextPart, ImagePart, ToolCallPart } from "@deepractice-ai/agentx-types";

type ContentPart =
  | TextPart // { type: "text", text: string }
  | ThinkingPart // { type: "thinking", reasoning: string }
  | ImagePart // { type: "image", data: string, mediaType: string }
  | FilePart // { type: "file", data: string, mediaType: string }
  | ToolCallPart // { type: "tool-call", id, name, input }
  | ToolResultPart; // { type: "tool-result", id, name, output }
```

---

### Platform API (`agentx/`)

AgentX platform contracts - the application context for agent management.

```typescript
import type {
  AgentX,
  AgentXLocal,
  AgentXRemote,
  AgentManager,
  SessionManager,
} from "@deepractice-ai/agentx-types";

// Two modes: Local (in-memory) and Remote (via network)
interface AgentXLocal {
  readonly mode: "local";
  readonly agents: AgentManager;
  readonly sessions: LocalSessionManager;
  readonly errors: ErrorManager;
}

interface AgentXRemote {
  readonly mode: "remote";
  readonly agents: AgentManager;
  readonly sessions: RemoteSessionManager;
  readonly platform: PlatformManager;
}
```

#### HTTP Endpoint Contracts

Type-safe HTTP API definitions using `Endpoint` type:

```typescript
import type {
  Endpoint,
  ListAgentsEndpoint,
  CreateAgentEndpoint,
} from "@deepractice-ai/agentx-types";

// Endpoint<Method, Path, Input, Output>
interface ListAgentsEndpoint extends Endpoint<"GET", "/agents", void, ListAgentsResponse> {}
interface CreateAgentEndpoint
  extends Endpoint<"POST", "/agents", CreateAgentRequest, CreateAgentResponse> {}
```

---

### Runtime Types (`runtime/`)

Runtime layer types for the "Define Once, Run Anywhere" architecture.

```typescript
import type { Runtime, RuntimeDriver, Container, Sandbox } from "@deepractice-ai/agentx-types";

// Runtime - Complete environment encapsulation
interface Runtime {
  readonly name: string;
  readonly container: Container;
  createSandbox(name: string): Sandbox;
  createDriver(definition: AgentDefinition, context: AgentContext, sandbox: Sandbox): RuntimeDriver;
}

// Container - Agent lifecycle management
interface Container {
  register(agent: Agent): void;
  get(agentId: string): Agent | undefined;
  remove(agentId: string): boolean;
  list(): Agent[];
}

// Sandbox - Resource isolation (OS + LLM)
interface Sandbox {
  readonly name: string;
  readonly os: OS; // FileSystem, Process, Env, Disk
  readonly llm: LLMProvider; // apiKey, baseUrl
}
```

**Key Concepts:**

| Type            | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `Runtime`       | Complete environment (Container + Sandbox + Driver)           |
| `RuntimeDriver` | Driver interface with sandbox access                          |
| `Container`     | Agent lifecycle management (1:N)                              |
| `Sandbox`       | Resource isolation per agent (OS + LLM)                       |
| `OS`            | Operating system abstraction (FileSystem, Process, Env, Disk) |
| `LLMProvider`   | LLM supply service (apiKey, baseUrl)                          |

---

### LLM Types (`llm/`)

Language model abstractions for stateless inference.

```typescript
import type { LLMConfig, LLMRequest, LLMResponse, StopReason } from "@deepractice-ai/agentx-types";

interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxThinkingTokens?: number;
}

type StopReason = "end_turn" | "max_tokens" | "tool_use" | "stop_sequence" | "error";
```

---

### MCP Types (`mcp/`)

Model Context Protocol - tools, resources, and prompts.

```typescript
import type {
  McpTool,
  McpResource,
  McpPrompt,
  McpTransportConfig,
} from "@deepractice-ai/agentx-types";

interface McpTool {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
}

type McpTransportConfig =
  | McpStdioTransport // Local process
  | McpSseTransport // SSE connection
  | McpHttpTransport // HTTP requests
  | McpSdkTransport; // In-process SDK
```

---

### Error Types (`error/`)

Unified error taxonomy for agent systems.

```typescript
import type { AgentError, ErrorSeverity } from "@deepractice-ai/agentx-types";

interface AgentError {
  category: "system" | "agent" | "llm" | "validation" | "unknown";
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

type ErrorSeverity = "fatal" | "error" | "warning";
```

---

## Design Decisions

### Why Separate Types Package?

1. **Zero Dependencies** - Can be imported anywhere without bloat
2. **Contract-First** - Types are the single source of truth
3. **Cross-Platform** - Same types work in Node.js, Browser, Edge
4. **Version Control** - Type changes are explicit and versioned

### Why Discriminated Unions?

TypeScript's type narrowing works best with discriminated unions:

```typescript
function handleEvent(event: AgentEventType) {
  switch (event.type) {
    case "text_delta":
      // TypeScript knows: event is TextDeltaEvent
      console.log(event.data.text);
      break;
    case "assistant_message":
      // TypeScript knows: event is AssistantMessageEvent
      console.log(event.data.content);
      break;
  }
}
```

### Why `subtype` for Messages?

Messages use `subtype` instead of `type` because:

1. `role` indicates WHO (user, assistant, tool, system)
2. `subtype` indicates WHAT TYPE of message (user, assistant, tool-call, tool-result)
3. This supports future message types with same role but different structure

```typescript
// Both are role: "assistant" but different subtypes
| AssistantMessage   // subtype: "assistant" - text response
| ToolCallMessage    // subtype: "tool-call" - tool request
```

---

## Type Guards

Runtime type checking for discriminated unions:

```typescript
import { isTextPart, isToolCallPart, isStopReason } from "@deepractice-ai/agentx-types";

// Content part guards
if (isTextPart(part)) {
  console.log(part.text);
}

// StopReason guard
if (isStopReason(value)) {
  // value is StopReason
}
```

---

## Package Dependencies

```text
agentx-types (this package)
     ↑
agentx-logger (logging facade)
     ↑
agentx-engine (Mealy Machine processors)
     ↑
agentx-agent (Agent runtime)
     ↑
agentx (Platform API + defineAgent)
     ↑
agentx-node (NodeRuntime + ClaudeDriver)
     ↑
agentx-ui (React components)
```

---

## Contributing

This package follows **strict type-only conventions**:

1. **No runtime code** - Only TypeScript types (except type guards)
2. **No dependencies** - Keep the package pure
3. **One file, one primary type** - Use PascalCase filenames
4. **Discriminated unions** - Always use `type` or `subtype` for discrimination
5. **JSDoc comments** - Document every public type with examples
6. **Design decisions** - Document WHY in module-level comments

---

## License

MIT
