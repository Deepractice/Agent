# Issue 016: AgentEventBus Extraction

## Background

Currently, `AgentInstance` in `agentx-core` implements event dispatch logic directly using a manual pub/sub pattern:

```typescript
// Current implementation in AgentInstance
private typedHandlers = new Map<string, Set<AgentEventHandler>>();
private globalHandlers = new Set<AgentEventHandler>();

private notifyHandlers(event: AgentOutput): void {
  if (isStateEvent(event)) {
    this.stateMachine.process(event);
  }
  this.executeInterceptorChain(event);
}

private dispatchToHandlers(event: AgentOutput): void {
  const typeHandlers = this.typedHandlers.get(event.type);
  if (typeHandlers) {
    for (const handler of typeHandlers) {
      handler(event);
    }
  }
  for (const handler of this.globalHandlers) {
    handler(event);
  }
}
```

This is essentially a simple EventBus implementation embedded within AgentInstance.

## Problem

1. **Tight Coupling**: Event dispatch logic is tightly coupled with AgentInstance
2. **Limited Extensibility**: Hard to swap implementation for distributed scenarios
3. **Testing Difficulty**: Cannot easily mock or spy on event bus behavior
4. **No Separation of Concerns**: AgentInstance handles both agent lifecycle AND event routing

## Proposed Solution

Extract the event dispatch mechanism into a formal `AgentEventBus` interface.

### Interface Definition

```typescript
// packages/agentx-types/src/AgentEventBus.ts
export interface AgentEventBus {
  /**
   * Emit an event to all subscribers
   */
  emit(event: AgentOutput): void;

  /**
   * Subscribe to a specific event type
   */
  on<T extends AgentOutput>(eventType: T["type"], handler: (event: T) => void): () => void;

  /**
   * Subscribe to all events
   */
  onAny(handler: (event: AgentOutput) => void): () => void;

  /**
   * Remove all subscriptions
   */
  destroy(): void;
}
```

### Implementation in agentx-core

```typescript
// packages/agentx-core/src/core/LocalAgentEventBus.ts
export class LocalAgentEventBus implements AgentEventBus {
  private typedHandlers = new Map<string, Set<AgentEventHandler>>();
  private globalHandlers = new Set<AgentEventHandler>();

  emit(event: AgentOutput): void {
    // Dispatch to typed handlers
    const handlers = this.typedHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    // Dispatch to global handlers
    for (const handler of this.globalHandlers) {
      handler(event);
    }
  }

  on<T extends AgentOutput>(eventType: T["type"], handler: (event: T) => void): () => void {
    if (!this.typedHandlers.has(eventType)) {
      this.typedHandlers.set(eventType, new Set());
    }
    this.typedHandlers.get(eventType)!.add(handler as AgentEventHandler);

    return () => {
      this.typedHandlers.get(eventType)?.delete(handler as AgentEventHandler);
    };
  }

  onAny(handler: (event: AgentOutput) => void): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  destroy(): void {
    this.typedHandlers.clear();
    this.globalHandlers.clear();
  }
}
```

### Usage in AgentInstance

```typescript
// packages/agentx-core/src/agent/AgentInstance.ts
export class AgentInstance implements Agent {
  private readonly eventBus: AgentEventBus;
  private readonly stateMachine: AgentStateMachine;

  constructor(options: AgentInstanceOptions) {
    this.eventBus = options.eventBus ?? new LocalAgentEventBus();

    // StateMachine subscribes to state events
    this.eventBus.on("conversation_active_state", (e) => this.stateMachine.process(e));
    this.eventBus.on("conversation_queued_state", (e) => this.stateMachine.process(e));
    // ... other state events
  }

  private notifyHandlers(event: AgentOutput): void {
    this.eventBus.emit(event);
  }

  on<T extends AgentOutput>(eventType: T["type"], handler: (event: T) => void): () => void {
    return this.eventBus.on(eventType, handler);
  }
}
```

## Benefits

1. **Separation of Concerns**: Event routing is isolated from agent lifecycle
2. **Testability**: Can easily mock EventBus for unit tests
3. **Extensibility**: Can implement distributed EventBus (Redis, WebSocket) for multi-node scenarios
4. **Consistency**: Single pattern for all event-driven communication

## Future Extensions

- `DistributedAgentEventBus` for multi-server deployments
- `LoggingAgentEventBus` decorator for debugging
- `BufferedAgentEventBus` for batching events

## Implementation Plan

1. Define `AgentEventBus` interface in `agentx-types`
2. Implement `LocalAgentEventBus` in `agentx-core`
3. Refactor `AgentInstance` to use EventBus
4. Update tests to use mocked EventBus
5. Document the new pattern

## Priority

Low - Current implementation works, this is a refactoring for maintainability and future extensibility.

## Related Issues

- #009 Engine Stateless Refactoring
- #010 Engine Stateless Architecture
- #011 Distributed Architecture Design
