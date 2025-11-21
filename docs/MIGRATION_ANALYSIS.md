# Agent SDK Migration Analysis

## Old agent-sdk vs New agentx-core Feature Comparison

### ✅ Already Implemented in agentx-core

| Feature                   | Old agent-sdk           | New agentx-core                       | Status |
| ------------------------- | ----------------------- | ------------------------------------- | ------ |
| Basic Agent creation      | `createAgent(config)`   | `createAgent(config)`                 | ✅     |
| Send messages             | `session.send()`        | `agent.send()`                        | ✅     |
| Event handling            | EventEmitter            | `agent.on()/off()`                    | ✅     |
| Message history           | `session.getMessages()` | `agent.messages`                      | ✅     |
| Event-driven architecture | RxJS Observable         | Native events                         | ✅     |
| Error handling            | `AgentError`            | `AgentConfigError`, `AgentAbortError` | ✅     |
| Abort support             | `session.abort()`       | `agent.clear()` + AbortController     | ✅     |
| Cleanup                   | `agent.destroy()`       | `agent.destroy()`                     | ✅     |

### ❌ Missing Features (Need to Migrate)

| Feature                   | Old agent-sdk                                            | New agentx-core               | Priority  |
| ------------------------- | -------------------------------------------------------- | ----------------------------- | --------- |
| **Session Management**    | `agent.createSession()`, `getSession()`, `getSessions()` | Single agent = single session | 🔴 High   |
| **Multi-session support** | Agent manages multiple Sessions                          | Agent is a Session            | 🔴 High   |
| **Session lifecycle**     | States: created, active, idle, completed, error          | Implicit in events            | 🟡 Medium |
| **Observable streams**    | RxJS `messages$()`, `statistics$()`                      | Event-based only              | 🟡 Medium |
| **Token usage tracking**  | `getTokenUsage()`, breakdown                             | ResultEvent has usage         | 🟢 Low    |
| **Cost calculation**      | Real-time cost tracking with pricing                     | ResultEvent has totalCostUsd  | 🟢 Low    |
| **Session statistics**    | Duration, API time, turns, messages                      | ResultEvent has durationMs    | 🟢 Low    |
| **Persistence layer**     | SQLite with `AgentPersister` interface                   | None                          | 🟡 Medium |
| **Browser support**       | BrowserAgent, VirtualSession                             | Not designed for browser      | 🟡 Medium |
| **WebSocket bridge**      | Server/Client WebSocket                                  | None                          | 🟡 Medium |
| **Dependency injection**  | AgentDependencies (adapter, persister)                   | Hard-coded ClaudeAdapter      | 🔴 High   |
| **Quick chat API**        | `agent.chat()`                                           | Must create agent per chat    | 🟢 Low    |
| **Session metadata**      | projectPath, custom fields                               | None                          | 🟢 Low    |

## Architecture Differences

### Old agent-sdk Architecture (Complex)

```
Agent (manages multiple Sessions)
  ├── SessionManager
  │   ├── Session 1 (BaseSession)
  │   │   ├── SessionStateMachine (XState)
  │   │   ├── MessageStream (RxJS)
  │   │   └── Statistics tracking
  │   ├── Session 2
  │   └── Session 3
  ├── AgentAdapter (ClaudeAdapter)
  ├── AgentPersister (SQLiteAgentPersister)
  └── WebSocketServer/Bridge
```

**Pros:**

- Multi-session support
- Full-featured (statistics, persistence, WebSocket)
- Dependency injection
- Browser/Server separation

**Cons:**

- Over-engineered for simple use cases
- Heavy dependencies (RxJS, XState, SQLite)
- Complex state management
- Hard to understand

### New agentx-core Architecture (Simple)

```
Agent (IS a session)
  ├── EventTransformer (SDK → AgentEvent)
  ├── Messages array
  └── Event handlers
```

**Pros:**

- Simple, easy to understand
- Minimal dependencies
- Direct Claude SDK integration
- Fast implementation

**Cons:**

- No multi-session support
- No persistence
- No statistics tracking (beyond basic usage)
- No browser/WebSocket support

## Migration Strategy

### Option 1: Keep agentx-core Simple (Recommended)

**Philosophy**: agentx-core is a thin wrapper around Claude SDK. For complex features, build separate packages.

```
@deepractice-ai/agentx-core        # Simple Agent wrapper (current)
@deepractice-ai/agentx-sessions    # Multi-session management
@deepractice-ai/agentx-persistence # SQLite/other persisters
@deepractice-ai/agentx-websocket   # WebSocket bridge
```

**Benefits:**

- Keep core simple and focused
- Users install only what they need
- Easier to maintain
- Clear separation of concerns

### Option 2: Migrate All Features to agentx-core

Add all old agent-sdk features to agentx-core:

- Session management
- RxJS observables
- Statistics tracking
- Persistence
- WebSocket support

**Benefits:**

- Feature parity with old SDK
- All-in-one package

**Drawbacks:**

- Heavy package
- Complex to maintain
- Against our "simple core" philosophy

### Option 3: Hybrid Approach

**Core features in agentx-core:**

- ✅ Basic Agent + send/receive
- ✅ Event handling
- ➕ Token usage tracking (extend current ResultEvent)
- ➕ Basic statistics (duration, cost)

**Separate packages:**

- Multi-session management
- Persistence
- WebSocket/Browser support
- Advanced features

## Recommended Next Steps

### Phase 1: Enhance agentx-core (Basic Features) ✅

Current status - mostly done! Just add:

1. ✅ Better token usage in ResultEvent (already there)
2. ➕ Session ID management
3. ➕ Better metadata support

### Phase 2: Build agentx-sessions (Multi-session)

Create new package for managing multiple agents/sessions:

```typescript
import { createSessionManager } from "@deepractice-ai/agentx-sessions";

const manager = createSessionManager(config);
const session1 = await manager.createSession();
const session2 = await manager.createSession();
```

### Phase 3: Build agentx-persistence (Optional)

For users who need persistence:

```typescript
import { SQLitePersister } from "@deepractice-ai/agentx-persistence";

const agent = createAgent({
  ...config,
  persister: new SQLitePersister("./data.db"),
});
```

### Phase 4: Build agentx-websocket (Optional)

For browser/server communication:

```typescript
import { createWebSocketBridge } from "@deepractice-ai/agentx-websocket";
```

## Conclusion

**Current agentx-core is good as a foundation!**

It provides:

- ✅ Simple, clean API
- ✅ Event-driven architecture
- ✅ Basic statistics (via ResultEvent)
- ✅ Error handling
- ✅ Claude SDK integration

**Don't over-engineer it.** Build additional features as separate packages when needed.

The old agent-sdk was over-complicated. The new approach is better.
