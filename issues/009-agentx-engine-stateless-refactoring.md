# Issue 009: AgentX Engine Stateless Refactoring

**Status**: In Progress
**Priority**: High
**Created**: 2025-01-22
**Last Updated**: 2025-01-22

## Problem

The `agentx-engine` package contains stateful components (AgentMessageAssembler, AgentStateMachine, AgentTurnTracker) that hold state in their instance variables. This violates the layered architecture principle where:

- **Engine Layer** = Pure logic (stateless)
- **Core Layer** = State management (stateful)

Current architecture causes high memory consumption in multi-session scenarios because each session creates separate instances of all reactors.

## Current Architecture

### Package Layering (After EventBus Refactoring)

```
┌─────────────────────────────────────────────────────────────────┐
│  agentx-framework (SSEServer, defineAgent)                      │
│    ↓ depends on                                                  │
├─────────────────────────────────────────────────────────────────┤
│  agentx-core (AgentRegistry, SessionStore, RxJSEventBus)        │
│    ↓ depends on                                                  │
├─────────────────────────────────────────────────────────────────┤
│  agentx-engine (AgentService, AgentEngine, EventBus interfaces) │
│    ↓ depends on                                                  │
├─────────────────────────────────────────────────────────────────┤
│  agentx-event, agentx-types, agentx-logger                      │
└─────────────────────────────────────────────────────────────────┘
```

### Current Resource Usage (1000 Concurrent Sessions)

```
1000 sessions
= 1000 × AgentService
= 1000 × AgentEngine
= 1000 × EventBus
= 1000 × AgentMessageAssembler  ❌ Stateful
= 1000 × AgentStateMachine      ❌ Stateful
= 1000 × AgentTurnTracker       ❌ Stateful
→ High memory consumption
```

### Stateful Components in agentx-engine

#### 1. AgentMessageAssembler

**Location**: `packages/agentx-engine/src/AgentMessageAssembler.ts`

**State**:

```typescript
private pendingContents: Map<number, PendingContent> = new Map();
private currentMessageId: string | null = null;
private messageStartTime: number | null = null;
```

**Lifecycle**: Per-message (created on `message_start`, cleared on `message_stop`)

#### 2. AgentStateMachine

**Location**: `packages/agentx-engine/src/AgentStateMachine.ts`

**State**:

```typescript
private currentState: AgentState = "initializing";
private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
private conversationStartTime: number | null = null;
```

**Lifecycle**: Per-session (tracks agent state throughout session)

#### 3. AgentTurnTracker

**Location**: `packages/agentx-engine/src/AgentTurnTracker.ts`

**State**:

```typescript
private pendingTurn: PendingTurn | null = null;
private costPerInputToken: number = 0.000003;
private costPerOutputToken: number = 0.000015;
```

**Lifecycle**: Per-turn (tracks request-response pairs)

## Goal

**Make agentx-engine completely stateless** by extracting state management to agentx-core.

### Why?

1. **Cost Reduction** (Primary Goal)
   - Reduce memory consumption for multi-session scenarios
   - Share stateless reactor logic across all sessions
   - Only store lightweight state data per session

2. **Scalability**
   - Enable horizontal scaling (multi-process/multi-machine)
   - State can be moved to external store (Redis, database)
   - Reactor logic can be duplicated freely without cost

3. **Architectural Clarity**
   - Clear separation: Engine = Logic, Core = State
   - Easier to understand and maintain
   - Consistent with EventBus refactoring pattern

### Target Architecture

```
1000 sessions
= 1 shared set of stateless Reactors (logic)
= 1000 lightweight state objects (data only)
→ Significantly lower memory usage
```

## Key Insight

**All events have `agentId` field** (`packages/agentx-event/src/base/AgentEvent.ts`):

```typescript
export interface AgentEvent {
  uuid: string;
  agentId: string; // ← Key for state isolation
  timestamp: number;
}
```

This means we can:

1. Store state externally by `agentId`
2. Reactors retrieve state using `event.agentId`
3. Multiple sessions' events naturally isolated by different `agentId` values

## Proposed Solution

### Approach: State Externalization Pattern

Similar to EventBus refactoring (interfaces in engine, implementation in core):

1. **Move state storage to agentx-core**
   - Create state store classes for each reactor
   - Index state by `agentId`

2. **Make reactors stateless in agentx-engine**
   - Reactors become pure logic processors
   - Receive state via dependency injection
   - Read/write state through store interface

### Example Refactoring: AgentMessageAssembler

**Before** (Stateful):

```typescript
// agentx-engine/src/AgentMessageAssembler.ts
class AgentMessageAssembler {
  private pendingContents: Map<number, PendingContent> = new Map();

  onTextDelta(event: TextDeltaEvent) {
    this.pendingContents.get(0).textDeltas.push(event.data.text);
  }
}
```

**After** (Stateless):

```typescript
// agentx-engine/src/AgentMessageAssembler.ts
interface MessageAssemblerState {
  pendingContents: Map<number, PendingContent>;
  currentMessageId: string | null;
  messageStartTime: number | null;
}

interface MessageAssemblerStateStore {
  getState(agentId: string): MessageAssemblerState;
  setState(agentId: string, state: MessageAssemblerState): void;
  deleteState(agentId: string): void;
}

class AgentMessageAssembler {
  constructor(private stateStore: MessageAssemblerStateStore) {}

  onTextDelta(event: TextDeltaEvent) {
    const state = this.stateStore.getState(event.agentId);
    state.pendingContents.get(0).textDeltas.push(event.data.text);
    this.stateStore.setState(event.agentId, state);
  }
}
```

```typescript
// agentx-core/src/MessageAssemblerStateStore.ts
class MessageAssemblerStateStore implements MessageAssemblerStateStore {
  private states = new Map<string, MessageAssemblerState>();

  getState(agentId: string): MessageAssemblerState {
    if (!this.states.has(agentId)) {
      this.states.set(agentId, this.createInitialState());
    }
    return this.states.get(agentId)!;
  }

  setState(agentId: string, state: MessageAssemblerState): void {
    this.states.set(agentId, state);
  }

  deleteState(agentId: string): void {
    this.states.delete(agentId);
  }

  private createInitialState(): MessageAssemblerState {
    return {
      pendingContents: new Map(),
      currentMessageId: null,
      messageStartTime: null,
    };
  }
}
```

### Implementation Steps

1. **Phase 1: AgentMessageAssembler**
   - [ ] Define `MessageAssemblerState` interface in agentx-engine
   - [ ] Define `MessageAssemblerStateStore` interface in agentx-engine
   - [ ] Implement state store in agentx-core
   - [ ] Refactor AgentMessageAssembler to use state store
   - [ ] Update AgentEngine to inject state store
   - [ ] Test multi-session scenario

2. **Phase 2: AgentStateMachine**
   - [ ] Define `StateMachineState` interface in agentx-engine
   - [ ] Define `StateMachineStateStore` interface in agentx-engine
   - [ ] Implement state store in agentx-core
   - [ ] Refactor AgentStateMachine to use state store
   - [ ] Update AgentEngine to inject state store
   - [ ] Test state transitions across sessions

3. **Phase 3: AgentTurnTracker**
   - [ ] Define `TurnTrackerState` interface in agentx-engine
   - [ ] Define `TurnTrackerStateStore` interface in agentx-engine
   - [ ] Implement state store in agentx-core
   - [ ] Refactor AgentTurnTracker to use state store
   - [ ] Update AgentEngine to inject state store
   - [ ] Test turn tracking across sessions

4. **Phase 4: Cleanup and Optimization**
   - [ ] Add state cleanup on session destroy
   - [ ] Add memory usage benchmarks
   - [ ] Document new architecture
   - [ ] Update CLAUDE.md with state management pattern

## Files to Create/Modify

### New Files (agentx-core)

- `packages/agentx-core/src/state/MessageAssemblerStateStore.ts`
- `packages/agentx-core/src/state/StateMachineStateStore.ts`
- `packages/agentx-core/src/state/TurnTrackerStateStore.ts`
- `packages/agentx-core/src/state/index.ts`

### New Files (agentx-engine - interfaces only)

- `packages/agentx-engine/src/state/MessageAssemblerState.ts`
- `packages/agentx-engine/src/state/StateMachineState.ts`
- `packages/agentx-engine/src/state/TurnTrackerState.ts`
- `packages/agentx-engine/src/state/index.ts`

### Modified Files

| File                                                  | Changes                                          |
| ----------------------------------------------------- | ------------------------------------------------ |
| `packages/agentx-engine/src/AgentMessageAssembler.ts` | Remove instance state, add stateStore dependency |
| `packages/agentx-engine/src/AgentStateMachine.ts`     | Remove instance state, add stateStore dependency |
| `packages/agentx-engine/src/AgentTurnTracker.ts`      | Remove instance state, add stateStore dependency |
| `packages/agentx-engine/src/AgentEngine.ts`           | Inject state stores into reactors                |
| `packages/agentx-engine/src/index.ts`                 | Export state interfaces                          |
| `packages/agentx-core/src/AgentService.ts`            | Create and manage state stores                   |
| `packages/agentx-core/src/index.ts`                   | Export state store implementations               |
| `CLAUDE.md`                                           | Document state externalization pattern           |

## Acceptance Criteria

- [ ] No instance variables holding state in agentx-engine reactors
- [ ] All reactor state stored in agentx-core state stores
- [ ] State isolated by `agentId` (multiple sessions don't interfere)
- [ ] Memory usage reduced in multi-session scenarios (benchmarked)
- [ ] State cleaned up when session destroyed (no memory leaks)
- [ ] All existing tests pass
- [ ] New tests for state isolation across sessions
- [ ] Documentation updated

## Benefits

### Before (Current)

```
Memory per session: ~5MB (full reactor instances)
1000 sessions: ~5GB
Scaling: Vertical only (single process)
```

### After (Stateless)

```
Memory per session: ~100KB (state data only)
1000 sessions: ~100MB (+ shared reactor logic)
Scaling: Horizontal (multi-process, distributed)
State storage: Can move to Redis/DB for true stateless
```

**Cost savings**: ~50x reduction in memory per session

## Related Issues

- Issue 008: Logging System Cleanup (similar pattern - facade vs implementation)
- EventBus Refactoring (completed) - established the interface/implementation pattern

## Progress

### Phase 0: Foundation - Global Singletons (✅ Completed - 2025-01-22)

Before refactoring individual reactors, we established the foundation by creating global singleton instances that will be shared across all sessions.

#### 1. Global EventBus Singleton

**Changed Files**:

- `packages/agentx-engine/src/RxJSEventBus.ts` (moved from agentx-core)
  - Added global singleton export: `export const globalEventBus = new RxJSEventBus();`
  - Updated logger name from "core" to "engine"

- `packages/agentx-engine/src/index.ts`
  - Added exports: `RxJSEventBus`, `globalEventBus`

- `packages/agentx-core/package.json`
  - Removed rxjs dependency (no longer needed in core)

**Rationale**: Having one EventBus per agent made the `agentId` field redundant. The correct architecture is:

- One global EventBus shared by all agents
- Events differentiated by `agentId` field
- This aligns with true "bus" concept and saves memory

#### 2. Stateless AgentService Singleton

**New File**: `packages/agentx-engine/src/AgentService.ts`

Created as a stateless runtime manager singleton (similar to web service layers):

```typescript
export class AgentService {
  private static instance: AgentService | null = null;
  private runtimes: Map<string, AgentRuntimeState> = new Map();

  static getInstance(): AgentService { ... }

  // Methods accept agentId as first parameter (stateless pattern)
  async initialize(agentId: string, driver: AgentDriver, config?: EngineConfig): Promise<void>
  async queue(agentId: string, message: string | UserMessage): Promise<void>
  async registerReactor(agentId: string, reactor: AgentReactor): Promise<Unsubscribe>
  getState(agentId: string): AgentState
  onStateChange(agentId: string, callback: StateChangeCallback): Unsubscribe
  abort(agentId: string): void
  async destroy(agentId: string): Promise<void>
}

export const agentService = AgentService.getInstance();
```

**Key Design**:

- Singleton pattern (like web services)
- All methods accept `agentId` as first parameter
- Stores runtime state per agent in a Map
- Uses global EventBus for event communication

#### 3. AgentInstance Class Refactoring

**Changed File**: `packages/agentx-core/src/AgentInstance.ts`

Converted from interface to class:

```typescript
// Before: interface AgentInstance extends AgentDriver { ... }
// After:  class AgentInstance implements AgentInfo { ... }
```

**Key Changes**:

- Removed `AgentDriver` inheritance (AgentInstance is no longer a driver itself)
- AgentInstance becomes the user-facing API that delegates to agentService singleton
- All runtime operations flow: `AgentInstance → agentService → AgentEngine → globalEventBus`
- Keeps local state: message history, turnStats, event handlers
- Methods delegate to `agentService.method(this.id, ...)`

#### 4. Updated All References

**Changed Files**:

- `packages/agentx-core/src/index.ts` - Export AgentInstance class
- `packages/agentx-framework/src/index.ts` - Re-export AgentInstance
- `packages/agentx-framework/src/createAgent.ts` - Return type
- `packages/agentx-framework/src/server/AgentServer.ts` - AgentFactory type
- `packages/agentx-framework/src/defineAgent.ts` - Create method return type
- `packages/agentx-ui/src/components/agent/AgentStatusIndicator.tsx` - Props type
- `packages/agentx-ui/src/components/chat/Chat.tsx` - Props type
- `packages/agentx-ui/src/components/chat/Chat.stories.tsx` - Story types
- `apps/agentx-web/src/App.tsx` - State type

#### 5. Fixed Type Errors

**Changed File**: `packages/agentx-core/src/AgentInstance.ts`

Fixed compilation errors:

- Line 206: Handle UserMessage.content (string | ContentPart[])
- Lines 379, 383: Fixed event types ("conversation_start" instead of "conversation_active", "turn_response" instead of "turn_complete")

#### Build Status

✅ All packages compile successfully:

```
Tasks:    10 successful, 10 total
Cached:    8 cached, 10 total
Time:     15.703s
```

### Next Steps

Now that the foundation is in place (global EventBus + AgentService singleton), we can proceed with refactoring individual reactors:

1. **Phase 1: AgentMessageAssembler** (Next)
2. **Phase 2: AgentStateMachine**
3. **Phase 3: AgentTurnTracker**
4. **Phase 4: Cleanup and Optimization**

## Notes

- This follows the same pattern as EventBus refactoring
- State stores in agentx-core can later be swapped with Redis/database implementations
- Reactor logic in agentx-engine becomes truly reusable and testable
- Clear architecture: Engine = How to process, Core = What to remember
- **Foundation Complete**: Global singleton infrastructure is now in place for reactor refactoring
