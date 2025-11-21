# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Always response user in Chinese。

Always do work in English。

## Project Overview

**Deepractice Agent** is a visual AI agent interface providing Claude capabilities through a web UI. It's a modular, full-stack application built as a monorepo with separate packages for different platforms.

**Key Characteristics**:

- Monorepo using pnpm workspaces + Turbo
- Modular architecture with `agentx-*` packages
- Platform-agnostic core with Node.js and Browser providers
- Event-driven architecture with standardized error handling
- Single-port deployment (5200) with embedded frontend

## ⚠️ CRITICAL: Contract-First Development

**BEFORE any development iteration, you MUST understand these contracts:**

### 1. `agentx-api` - THE Source of Truth for Events & Interfaces

```typescript
// ALL event types MUST be defined here
export const ALL_EVENT_TYPES = [
  "user",
  "assistant",
  "stream_event",
  "result",
  "system",
  "error",
] as const;

// ALL error structures MUST follow this schema
export interface ErrorEvent extends BaseAgentEvent {
  type: "error";
  subtype: "system" | "agent" | "llm" | "validation" | "unknown";
  severity: "fatal" | "error" | "warning";
  message: string;
  code?: string;
  details?: unknown;
  recoverable?: boolean;
  // ... base fields (uuid, sessionId, timestamp)
}
```

### 2. `agentx-types` - THE Source of Truth for Messages & Content

```typescript
// ALL message types MUST follow this
export type Message = UserMessage | AssistantMessage | SystemMessage;

// ALL content parts MUST follow this
export type ContentPart = TextPart | ImagePart | FilePart;
```

### Golden Rules

1. ✅ **READ CONTRACTS FIRST** - Always check `agentx-api` and `agentx-types` before implementing
2. ✅ **NEVER bypass contracts** - Don't create ad-hoc event/message formats
3. ✅ **UPDATE contracts FIRST** - If you need new event types, update `agentx-api` first
4. ✅ **ALL layers must comply** - Core, Providers, UI must all follow the same contracts
5. ✅ **TypeScript is your guardian** - If types don't match, you're breaking the contract

### Example: Adding New Feature

❌ **WRONG** - Implement first, define types later:

```typescript
// In BrowserProvider.ts
ws.send(
  JSON.stringify({
    type: "my_new_event", // ← Not in contract!
    myData: "...",
  })
);
```

✅ **CORRECT** - Contract first, implementation second:

```typescript
// 1. FIRST: Update agentx-api/src/events/MyNewEvent.ts
export interface MyNewEvent extends BaseAgentEvent {
  type: "my_new_event";
  data: string;
}

// 2. Add to AgentEvent union
export type AgentEvent = ... | MyNewEvent;

// 3. Add to ALL_EVENT_TYPES
export const ALL_EVENT_TYPES = [..., "my_new_event"] as const satisfies readonly EventType[];

// 4. THEN: Implement in providers/UI
ws.send(JSON.stringify(event));  // ← Now type-safe!
```

### What Happens When You Break Contracts?

- 🔴 **Runtime errors**: `Cannot read property 'toUpperCase' of undefined`
- 🔴 **Silent failures**: Events not forwarded, errors not displayed
- 🔴 **Type mismatches**: TypeScript errors across packages
- 🔴 **Integration bugs**: Frontend and backend out of sync

**Remember**: `agentx-api` and `agentx-types` are your **API contracts**. Treat them like database schemas - change them deliberately and propagate changes everywhere.

## Architecture Overview

### Package Structure

```
Agent/
├── apps/
│   └── agent/                  # Full-stack application (deprecated, being refactored)
└── packages/
    ├── agentx-api/             # Event types, interfaces, errors (pure types)
    ├── agentx-types/           # Message types, content types (pure types)
    ├── agentx-core/            # Platform-agnostic core (Agent, EventBus, Logger)
    ├── agentx-node/            # Node.js provider (Claude SDK adapter, WebSocket server)
    ├── agentx-browser/         # Browser provider (WebSocket client)
    └── agentx-ui/              # React UI components (Storybook)
```

### Dependency Graph

```
agentx-ui ──────→ agentx-browser ──→ agentx-core ──→ agentx-api
                                              ↘
                                                agentx-types
                                              ↗
agentx-node ──────────────────────→ agentx-core ──→ agentx-api
```

**Principles**:

- **Bottom-up**: Pure types → Core logic → Platform providers → UI
- **No circular dependencies**: Strict layering enforced by TypeScript
- **Single source of truth**: Event types defined once in `agentx-api`

### Package Responsibilities

#### `agentx-api` - API Contracts

**Purpose**: Public API types and interfaces (no implementation)

```typescript
// Event types with single source of truth
export const ALL_EVENT_TYPES = [
  "user",
  "assistant",
  "stream_event",
  "result",
  "system",
  "error",
] as const;
export type EventType = AgentEvent["type"];

// Error categorization
export type ErrorSubtype = "system" | "agent" | "llm" | "validation" | "unknown";
export type ErrorSeverity = "fatal" | "error" | "warning";
```

**Key exports**:

- Event types: `AgentEvent`, `ErrorEvent`, `UserMessageEvent`, etc.
- Interfaces: `Agent`, `AgentConfig`
- Errors: `AgentConfigError`, `AgentAbortError`
- Constants: `ALL_EVENT_TYPES`

#### `agentx-types` - Domain Types

**Purpose**: Message and content types (pure data structures)

```typescript
// Message types
export type Message = UserMessage | AssistantMessage | SystemMessage;

// Content types
export type ContentPart = TextPart | ImagePart | FilePart;
```

#### `agentx-core` - Platform-Agnostic Core

**Purpose**: Core agent logic that works on any platform

**Key classes**:

- `Agent` - Main agent implementation
- `AgentEventBus` - Event communication (RxJS-based)
- `LoggerProvider` - Logging abstraction

**Architecture**:

```typescript
class Agent {
  constructor(config, provider: AgentProvider, logger?: LoggerProvider);
  async send(message: string): Promise<void>;
  on<T>(event: EventType, handler): () => void;
  clear(): void;
  destroy(): void;
}
```

**Error handling**:

```typescript
// Centralized error handling in Agent
private emitErrorEvent(
  error: Error | string,
  subtype: ErrorSubtype,
  severity: ErrorSeverity,
  code?: string,
  recoverable?: boolean
): void
```

#### `agentx-node` - Node.js Provider

**Purpose**: Node.js-specific implementation

**Key classes**:

- `ClaudeAgentProvider` - Adapts `@anthropic-ai/claude-agent-sdk` to AgentProvider
- `WebSocketServer` - Real-time communication for browser clients
- `WebSocketBridge` - Forwards all Agent events to WebSocket clients

**WebSocketBridge Pattern**:

```typescript
// Automatically subscribes to ALL event types
ALL_EVENT_TYPES.forEach((eventType) => {
  agent.on(eventType, (payload) => {
    ws.send(JSON.stringify(payload));
  });
});
```

**Error format compliance**:

```typescript
// All errors sent to clients MUST follow ErrorEvent schema
const errorEvent: ErrorEvent = {
  type: "error",
  subtype: "system",
  severity: "error",
  message: "Error description",
  code: "ERROR_CODE",
  recoverable: true,
  uuid: generateId(),
  sessionId: session.id,
  timestamp: Date.now(),
};
```

#### `agentx-browser` - Browser Provider

**Purpose**: Browser-side WebSocket client

**Key classes**:

- `BrowserProvider` - Implements AgentProvider via WebSocket
- Handles reconnection, error events, message forwarding

**Pattern**:

```typescript
// Browser has its own Agent instance
const agent = createAgent({
  wsUrl: "ws://localhost:5200/ws",
  sessionId: "my-session",
});

// BrowserProvider bridges to server-side Agent via WebSocket
```

#### `agentx-ui` - React Components

**Purpose**: Reusable React components (Storybook-driven)

**Key components**:

- `<Chat>` - Complete chat interface
- `<ErrorMessage>` - Error display component
- `<ChatMessageList>` - Message rendering
- `<ChatInput>` - User input

**Error handling pattern**:

```typescript
// Chat.tsx listens to error events
agent.on("error", (event) => {
  setErrors((prev) => [...prev, event]);
});

// Displays ErrorMessage components
{errors.map((error) => (
  <ErrorMessage key={error.uuid} error={error} showDetails={true} />
))}
```

## Event System Architecture

### Event Types (Single Source of Truth)

```typescript
// agentx-api/src/events/AgentEvent.ts
export const ALL_EVENT_TYPES = [
  "user", // User message
  "assistant", // Assistant response (complete)
  "stream_event", // Streaming delta (incremental)
  "result", // Success result with stats
  "system", // System initialization
  "error", // Error event
] as const satisfies readonly EventType[];
```

**Benefits**:

- TypeScript enforces completeness at compile time
- Runtime iteration for event subscriptions
- Cannot miss event types (will get type error)

**Usage**:

```typescript
// WebSocketBridge uses it to subscribe to all events
import { ALL_EVENT_TYPES } from "@deepractice-ai/agentx-api";

ALL_EVENT_TYPES.forEach((eventType) => {
  agent.on(eventType, forwardToWebSocket);
});
```

### Error Event Architecture

**Error flow**:

```
Error occurs → emitErrorEvent() → ErrorEvent → EventBus → ErrorMessage UI
```

**ErrorEvent structure**:

```typescript
interface ErrorEvent {
  type: "error";
  subtype: "system" | "agent" | "llm" | "validation" | "unknown";
  severity: "fatal" | "error" | "warning";
  message: string;
  code?: string;
  details?: unknown;
  recoverable?: boolean;
  uuid: string;
  sessionId: string;
  timestamp: number;
}
```

**Error categorization**:

- `system` - WebSocket, network, infrastructure errors
- `agent` - Agent logic, validation errors
- `llm` - Claude SDK errors (rate limit, max turns, etc.)
- `validation` - Input validation errors
- `unknown` - Uncategorized errors

**Centralized handling**:

```typescript
// Core layer: Agent.ts
private emitErrorEvent(
  error: Error | string,
  subtype: ErrorSubtype,
  severity: ErrorSeverity = "error",
  code?: string,
  recoverable?: boolean
): void {
  // Constructs ErrorEvent
  // Logs error
  // Emits to EventBus
  // Warns if no error handler registered
}
```

**Provider layer examples**:

```typescript
// ClaudeAgentProvider (Node.js)
catch (error) {
  this.emitErrorEvent(
    error.message,
    "llm",
    "error",
    "LLM_ERROR",
    true
  );
}

// BrowserProvider (Browser)
ws.onerror = () => {
  this.emitErrorEvent(
    "WebSocket connection error",
    "system",
    "error",
    "WS_ERROR",
    true
  );
};
```

**UI layer**:

```typescript
// ErrorMessage component with defensive defaults
const severity = error.severity || "error";
const subtype = error.subtype || "unknown";
const errorMessage = error.message || "Unknown error";
```

## Commands

### Development

```bash
# Start full development environment
pnpm dev

# Start Storybook for UI development
cd packages/agentx-ui && pnpm storybook

# Start only server (port 5200)
cd apps/agent && pnpm dev:server
```

**Access**:

- Frontend: http://localhost:5173 (development with HMR)
- Storybook: http://localhost:6006 (UI components)
- Server: http://localhost:5200 (API + WebSocket)

### Build & Quality

```bash
# Build all packages in dependency order
pnpm build

# Build specific package
pnpm --filter @deepractice-ai/agentx-core build

# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Run tests
pnpm test

# Clean all build outputs
pnpm clean
```

### Testing

```bash
# Run tests in watch mode
pnpm --filter @deepractice-ai/agentx-node test:watch

# Run BDD tests for specific package
pnpm --filter <package-name> test
```

## Development Workflow

### Making Changes

**🚨 STEP 0: CHECK THE CONTRACTS FIRST! 🚨**

Before writing ANY code, always:

1. Read `agentx-api` - Check event types, interfaces, error schemas
2. Read `agentx-types` - Check message and content types
3. Understand the contract - Know what you're implementing against

**THEN proceed:**

1. **Identify the layer**:
   - **Contract change needed?** → Update `agentx-api` or `agentx-types` FIRST
   - Core logic? → `agentx-core`
   - Node.js specific? → `agentx-node`
   - Browser specific? → `agentx-browser`
   - UI components? → `agentx-ui`

2. **Make changes**:

   ```bash
   # Edit files (Vite HMR for frontend, Storybook hot reload for UI)
   ```

3. **Rebuild affected packages**:

   ```bash
   pnpm --filter @deepractice-ai/agentx-api build
   ```

4. **Test**:

   ```bash
   pnpm --filter <package-name> test
   ```

5. **Build everything** (validates dependencies):
   ```bash
   pnpm build
   ```

### Adding New Event Types

**CRITICAL**: Follow this checklist to avoid missing event forwarding:

1. ✅ Add event interface to `agentx-api/src/events/`
2. ✅ Add to `AgentEvent` union type
3. ✅ **Add to `ALL_EVENT_TYPES` array** (TypeScript will error if type doesn't match)
4. ✅ Export from `agentx-api/src/events/index.ts`
5. ✅ Export from `agentx-api/src/index.ts`
6. ✅ Rebuild: `pnpm --filter @deepractice-ai/agentx-api build`

**Example**:

```typescript
// 1. Create event interface
export interface MyEvent extends BaseAgentEvent {
  type: "my_event";
  data: string;
}

// 2. Add to union
export type AgentEvent = UserMessageEvent | AssistantMessageEvent | MyEvent; // ← Add here

// 3. Update ALL_EVENT_TYPES (TypeScript will validate)
export const ALL_EVENT_TYPES = [
  "user",
  "assistant",
  "my_event", // ← Add here (will error if type doesn't exist)
] as const satisfies readonly EventType[];
```

**Benefits**:

- WebSocketBridge automatically forwards new event type
- TypeScript catches forgotten updates
- No manual synchronization needed

### Creating Changesets

Before submitting PRs:

```bash
# Create file directly in .changeset/ directory
# Example: .changeset/fix-error-handling.md
```

**Format**:

```yaml
---
"@deepractice-ai/agentx-core": patch
"@deepractice-ai/agentx-node": patch
---
Fix error handling in WebSocketBridge
```

## Code Style & Conventions

### Language

- **Code, comments, logs, errors**: Always English
- **Documentation**: English
- **User-facing**: Chinese

### Naming

**Files**:

- **PascalCase**: One file, one primary type (e.g., `Agent.ts` → `export class Agent`)
- **camelCase**: Multiple exports or utilities (e.g., `helpers.ts`)

**Types**:

```typescript
// Classes - PascalCase
class AgentCore { }
class WebSocketBridge { }

// Interfaces - PascalCase (NO 'I' prefix)
interface Agent { }
interface ErrorEvent { }

// Type aliases - PascalCase
type EventType = AgentEvent["type"];
type ErrorSeverity = "fatal" | "error" | "warning";

// Constants - UPPER_SNAKE_CASE or ALL_EVENT_TYPES style
const DEFAULT_PORT = 5200;
export const ALL_EVENT_TYPES = [...] as const;
```

### Import Aliases

- `~/*` - Internal package imports
- `@/*` - External package imports

```typescript
import { getConfig } from "~/core/config"; // Internal
import { Agent } from "@deepractice-ai/agentx-api"; // External
```

## Testing Strategy

**Philosophy**: BDD (80%) for behavior + Unit tests (20%) for edge cases

### BDD with Cucumber

- Test user-facing behavior
- Feature files in `features/` directory
- Step definitions in `tests/steps/`
- Use `@deepractice-ai/vitest-cucumber` plugin

### Unit Tests

- Test algorithms, edge cases, error handling
- Co-locate with source: `Agent.ts` → `Agent.test.ts`
- Use standard Vitest API

## Common Issues

### Port Already in Use

```bash
lsof -ti:5200 | xargs kill -9
# Or
cd apps/agent && pnpm dev:clean
```

### Build Cache Issues

```bash
pnpm clean
pnpm build
```

### Changes Not Reflected

```bash
# Rebuild specific package
pnpm --filter @deepractice-ai/agentx-core build

# Or rebuild everything
pnpm build
```

### Dev Server Not Hot Reloading

**Node.js server**: Manual restart required

```bash
# Stop (Ctrl+C) and restart
pnpm dev
```

**Frontend/Storybook**: Should auto-reload (Vite HMR)

### TypeScript Errors After Adding Event Type

**Symptom**: `Type 'xxx' is not assignable to type 'EventType'`

**Cause**: Forgot to add to `ALL_EVENT_TYPES`

**Fix**:

```typescript
// agentx-api/src/events/AgentEvent.ts
export const ALL_EVENT_TYPES = [
  // ... existing types
  "new_event_type", // ← Add here
] as const satisfies readonly EventType[];
```

## Architecture Decisions

### Why Modular Packages?

- **Separation of concerns**: Types, core, providers, UI all independent
- **Platform flexibility**: Core works on Node.js and Browser
- **Testability**: Each package can be tested in isolation
- **Reusability**: UI components can be used in any React app

### Why Event-Driven Architecture?

- **Decoupling**: Providers don't need to know about UI
- **Flexibility**: Easy to add new event types
- **Real-time**: Natural fit for streaming responses
- **Error propagation**: Errors flow through the same event system

### Why Single Source of Truth for Events?

- **Type safety**: TypeScript validates at compile time
- **Maintainability**: Update once, affects everywhere
- **Prevents bugs**: Cannot forget to forward new event types

### Why Centralized Error Handling?

- **Consistency**: All errors follow same format
- **Debugging**: Errors logged and propagated systematically
- **User experience**: UI can display all errors uniformly

## Related Documentation

- [README.md](README.md) - User-facing documentation
- [Architecture Overview](docs/ARCHITECTURE.md) - Detailed system design (if exists)
- [Testing Strategy](docs/testing-strategy.md) - BDD + Unit testing approach (if exists)
