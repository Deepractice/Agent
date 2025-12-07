# 037: BusPresenter Event Transformation Fix

## Summary

Fixed critical issues in `BusPresenter` where:

1. Stream layer events were being duplicated (sent both via DriveableEvent and SystemEvent)
2. Message layer events were not converted to proper `Message` type format for persistence
3. Event context (imageId) was missing, causing frontend event filtering to fail

## Problem Analysis

### Event Flow Architecture

```
External DriveableEvent (Claude API)
        |
    AgentDriver (converts)
        |
Internal StreamEvent (lightweight)
        |
    MealyMachine (processes)
        |
AgentOutput (4 layers: Stream/State/Message/Turn)
        |
    AgentPresenter (should convert to SystemEvent)
        |
SystemEvent (full context)
```

### Issues Found

#### 1. Stream Event Duplication

- `ClaudeReceptor` emits DriveableEvents to SystemBus (source="environment")
- MealyMachine passes through Stream events
- `BusPresenter` was re-emitting them as SystemEvents (source="agent")
- Result: `text_delta` events sent twice to frontend

#### 2. Message Data Format Mismatch

Event data format (`AssistantMessageEvent.data`):

```typescript
{
  messageId: string;      // <-- "messageId"
  content: ContentPart[];
  stopReason?: string;
  timestamp: number;
  // No role, no subtype
}
```

Expected Message type format:

```typescript
{
  id: string;             // <-- "id" (not "messageId")
  role: "assistant";      // Required
  subtype: "assistant";   // Required
  content: ContentPart[];
  timestamp: number;
}
```

The mismatch caused:

- Messages saved with wrong structure
- Frontend couldn't load history (all fields `undefined`)
- React key warnings (missing `id`)

#### 3. Missing imageId in Event Context

Events needed `imageId` in context for frontend filtering, but it wasn't being set correctly in all code paths.

## Solution

### BusPresenter Changes

```typescript
class BusPresenter implements AgentPresenter {
  present(_agentId: string, output: AgentOutput): void {
    const category = this.getCategoryForOutput(output);

    // 1. SKIP Stream layer - already sent via DriveableEvent
    if (category === "stream") {
      return;
    }

    // 2. Convert Message layer data to proper Message type
    let data: unknown = output.data;
    if (category === "message") {
      data = this.convertToMessage(output);
    }
    // State and Turn layer data formats match SystemEvent expectations

    // 3. Build complete SystemEvent with full context
    const systemEvent: SystemEvent = {
      type: output.type,
      timestamp: output.timestamp,
      data,
      source: "agent",
      category,
      intent: "notification",
      context: {
        containerId: this.containerId,
        imageId: this.imageId,        // Now included
        agentId: this.agentId,
        sessionId: this.session.sessionId,
      },
    };

    this.producer.emit(systemEvent);

    // 4. Persist Message layer to session
    if (category === "message") {
      this.session.addMessage(data as Message).catch(...);
    }
  }

  private convertToMessage(output: AgentOutput): Message {
    // Convert messageId -> id
    // Add role and subtype fields
    // Normalize content structure for each message type
  }
}
```

### Frontend Changes

Updated `useAgent` hook to expect new Message format:

```typescript
// Before
const data = event.data as { messageId: string; ... };
// After
const data = event.data as { id: string; role: string; subtype: string; ... };
```

## Event Layer Responsibilities

| Layer   | BusPresenter Action      | Reason                                              |
| ------- | ------------------------ | --------------------------------------------------- |
| Stream  | SKIP                     | Already sent via DriveableEvent from ClaudeReceptor |
| State   | Emit as SystemEvent      | State transitions need context for UI               |
| Message | Convert + Emit + Persist | Data format transformation + storage                |
| Turn    | Emit as SystemEvent      | Analytics/billing events                            |

## Files Changed

- `packages/runtime/src/internal/RuntimeAgent.ts` - BusPresenter rewrite
- `packages/ui/src/hooks/useAgent.ts` - Updated event data handling
- `packages/runtime/src/RuntimeImpl.ts` - Cleaned up debug logs

## Testing

1. Create new conversation
2. Send message
3. Verify response displays correctly
4. Switch to another conversation
5. Switch back - history should load correctly
6. All messages should have proper formatting

## Related Issues

- Image-First persistence model implementation
- SSE connection race condition fix (branch: fix/sse-connection-race-condition)
