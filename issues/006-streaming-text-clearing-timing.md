# Issue #006: Streaming Text Clearing Timing Issue in Continuous Message Sending

**Status**: 🟡 Bug
**Priority**: Medium
**Created**: 2025-11-17
**Assignee**: TBD
**Labels**: `bug`, `frontend`, `streaming`, `ui`, `continuous-messaging`

---

## Problem

When users send multiple messages continuously (without waiting for previous response to complete), the streaming text rendering may stop working after the first `exchange_response` event, causing subsequent messages to not display their streaming text properly.

### User Impact

Users trying to send messages rapidly will experience:

- First message streams correctly ✅
- Second message streaming text may not render ❌
- UI feels "stuck" or unresponsive
- Poor user experience for rapid conversations

---

## Reproduction Steps

1. Enable continuous message sending (remove `disabled={isLoading}` from ChatInput)

2. Send first message:

   ```
   User: "Hello"
   ```

3. **Immediately** send second message (before first response completes):

   ```
   User: "How are you?"
   ```

4. **Observe**:
   - First message streams correctly
   - Second message may not show streaming text properly
   - Text appears suddenly instead of streaming

5. **Expected**: Both messages should stream smoothly regardless of timing

---

## Root Cause Analysis

### Current Event Flow

```
Message 1:
  text_delta → streaming += "Hello"
  text_delta → streaming += " there"
  assistant_message → streaming = "" (cleared!)
  exchange_response → streaming = "" (cleared again!)

Message 2:
  text_delta → streaming += "I'm" (but might arrive BEFORE Message 1's clear!)
  [TIMING ISSUE: If text_delta arrives before assistant_message clear]
  assistant_message → streaming = "" (clears Message 2's text!)
  exchange_response → streaming = "" (already empty)
```

### The Problem: Premature Clearing

**In `Chat.tsx` (lines 97-111)**:

```typescript
onAssistantMessage(event: AssistantMessageEvent) {
  setStreaming("");  // ❌ Clears immediately, may clear next message's text!
  setMessages((prev) => [...prev, assistantMsg]);
}

onExchangeResponse(_event: ExchangeResponseEvent) {
  setIsLoading(false);
  setStreaming("");  // ❌ Redundant clear (already cleared in assistant_message)
}
```

**Why it breaks**:

1. Message 1's `assistant_message` event fires → clears streaming
2. Message 2's `text_delta` arrives → adds to streaming
3. But Message 1's `exchange_response` fires → clears streaming again!
4. Message 2's streaming text is lost

**Timing race condition**:

```
Time 0: Message 1 text_delta → streaming = "Hello"
Time 1: Message 1 assistant_message → streaming = "" (clear)
Time 2: Message 2 text_delta → streaming = "World" (new message starts)
Time 3: Message 1 exchange_response → streaming = "" (WRONG! Clears Message 2!)
```

---

## Code Location

**File**: `packages/agentx-ui/src/components/chat/Chat.tsx`

**Problematic code** (lines 97-111, 168-172):

```typescript
onAssistantMessage(event: AssistantMessageEvent) {
  console.log("[Chat] assistant_message:", event.uuid);
  const assistantMsg = event.data;

  // ❌ PROBLEM: Clears streaming too early
  setStreaming("");

  setMessages((prev) => {
    if (prev.some((m) => m.id === assistantMsg.id)) {
      return prev;
    }
    return [...prev, assistantMsg];
  });
},

onExchangeResponse(_event: ExchangeResponseEvent) {
  console.log("[Chat] exchange_response - exchange complete");
  setIsLoading(false);
  setStreaming("");  // ❌ PROBLEM: Redundant clear, may interfere with next message
},
```

---

## Proposed Solutions

### Option 1: Clear on Message Start ⭐ **Recommended**

Clear streaming text when a **new message starts**, not when the previous one ends.

```typescript
// Chat.tsx

onMessageStart(event: MessageStartEvent) {  // ✅ NEW: Clear on new message start
  console.log("[Chat] message_start - clearing previous streaming text");
  setStreaming("");
}

onTextDelta(event: TextDeltaEvent) {
  console.log("[Chat] text_delta:", event.data.text);
  setStreaming((prev) => prev + event.data.text);
}

onAssistantMessage(event: AssistantMessageEvent) {
  console.log("[Chat] assistant_message:", event.uuid);
  // ✅ REMOVED: Don't clear here, let next message_start handle it
  // setStreaming("");

  setMessages((prev) => {
    if (prev.some((m) => m.id === assistantMsg.id)) {
      return prev;
    }
    return [...prev, assistantMsg];
  });
}

onExchangeResponse(_event: ExchangeResponseEvent) {
  console.log("[Chat] exchange_response - exchange complete");
  setIsLoading(false);
  // ✅ REMOVED: Don't clear here
  // setStreaming("");
}
```

**Pros**:

- Fixes timing race condition
- Streaming text persists until next message truly starts
- Smooth visual transition between messages
- No premature clearing

**Cons**:

- Streaming text stays visible slightly longer (until next message)
- Requires adding `onMessageStart` handler

---

### Option 2: Message-ID-based Streaming State

Track which message the streaming text belongs to, clear only if it matches.

```typescript
const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

onMessageStart(event: MessageStartEvent) {
  setStreamingMessageId(event.data.messageId);
  setStreaming("");
}

onTextDelta(event: TextDeltaEvent) {
  // Only append if it's for the current message
  if (event.data.messageId === streamingMessageId) {
    setStreaming((prev) => prev + event.data.text);
  }
}

onAssistantMessage(event: AssistantMessageEvent) {
  // Only clear if it's for the current message
  if (event.data.id === streamingMessageId) {
    setStreaming("");
    setStreamingMessageId(null);
  }
  setMessages((prev) => [...prev, assistantMsg]);
}
```

**Pros**:

- Most precise, no race conditions possible
- Clear ownership of streaming text

**Cons**:

- More complex state management
- Requires messageId tracking across events
- May not be necessary if Option 1 works

---

### Option 3: Remove All Clearing (Let New Text Overwrite)

Simply never clear streaming, let new messages naturally overwrite.

```typescript
onTextDelta(event: TextDeltaEvent) {
  // Just append, don't worry about clearing
  setStreaming((prev) => prev + event.data.text);
}

onAssistantMessage(event: AssistantMessageEvent) {
  // Don't clear
  setMessages((prev) => [...prev, assistantMsg]);
}
```

**Pros**:

- Simplest solution
- No timing issues

**Cons**:

- ❌ Text from previous message bleeds into next message
- ❌ Cumulative text grows indefinitely
- ❌ Not acceptable

---

## Recommended Solution

**Use Option 1** (Clear on Message Start):

### Implementation Steps

1. Add `onMessageStart` handler to `Chat.tsx`
2. Move `setStreaming("")` from `onAssistantMessage` to `onMessageStart`
3. Remove `setStreaming("")` from `onExchangeResponse`
4. Test with continuous message sending

### Code Changes

```diff
// Chat.tsx

const unsubscribe = agent.react({
+  // Clear streaming text when new message starts
+  onMessageStart(_event: MessageStartEvent) {
+    console.log("[Chat] message_start - clearing previous stream");
+    setStreaming("");
+  },
+
  // Stream layer - handle text deltas for real-time streaming
  onTextDelta(event: TextDeltaEvent) {
    console.log("[Chat] text_delta:", event.data.text);
    setStreaming((prev) => prev + event.data.text);
  },

  onAssistantMessage(event: AssistantMessageEvent) {
    console.log("[Chat] assistant_message:", event.uuid);
    const assistantMsg = event.data;

-    // Clear streaming but keep loading (exchange may continue with tool calls)
-    setStreaming("");
    // DON'T set isLoading(false) here - wait for exchange_response
    setMessages((prev) => {
      if (prev.some((m) => m.id === assistantMsg.id)) {
        return prev;
      }
      return [...prev, assistantMsg];
    });
  },

  onExchangeResponse(_event: ExchangeResponseEvent) {
    console.log("[Chat] exchange_response - exchange complete");
    setIsLoading(false);
-    setStreaming("");
  },
});
```

### Import Addition

```diff
import type {
  ErrorMessageEvent,
  TextDeltaEvent,
+  MessageStartEvent,
  ToolResultEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ConversationStartStateEvent,
  ConversationEndStateEvent,
  ExchangeResponseEvent,
  ErrorMessage as ErrorMessageType,
} from "@deepractice-ai/agentx-framework/browser";
```

---

## Testing Strategy

### Manual Testing

```bash
# Test 1: Single message (baseline)
pnpm dev
# Send one message → Should stream normally

# Test 2: Continuous messages (the bug scenario)
# Send message "Hello"
# IMMEDIATELY send "World" (don't wait)
# IMMEDIATELY send "Test" (don't wait)
# → All three should stream correctly

# Test 3: Rapid fire
# Send 5 messages as fast as possible
# → All should stream without visual glitches
```

### Acceptance Criteria

✅ First message streams correctly
✅ Second message (sent before first completes) streams correctly
✅ Third message and beyond stream correctly
✅ No text bleeding between messages
✅ No sudden text disappearance
✅ Smooth visual experience

---

## Related Issues

- None directly related
- This is a new issue discovered when implementing continuous message sending

---

## Impact

**Severity**: Medium

**Affected users**:

- Users who send messages rapidly
- Users who don't wait for responses
- Power users expecting ChatGPT-like responsiveness

**User confusion**: Medium - Messages work but streaming feels broken

---

## Success Criteria

After fix, when sending multiple messages continuously:

✅ All messages stream smoothly
✅ No timing race conditions
✅ Streaming text clears at correct time
✅ No visual glitches or text bleeding
✅ Feels like ChatGPT's continuous messaging

---

## Additional Notes

### Why This Wasn't Noticed Before

Previously, the input was disabled (`disabled={isLoading}`) during responses, making continuous sending impossible. The bug was hidden.

When we enabled continuous sending (for better UX), the timing issue surfaced.

### Backend is Fine

The backend (ClaudeSDKDriver) correctly handles `AsyncIterable<UserMessage>` and processes messages sequentially with proper `continue: true` session management. This is purely a frontend rendering timing issue.

---

## References

- Chat.tsx: `packages/agentx-ui/src/components/chat/Chat.tsx`
- ClaudeSDKDriver: `packages/agentx-framework/src/drivers/ClaudeSDKDriver.ts`
- ChatMessageList: `packages/agentx-ui/src/components/chat/ChatMessageList.tsx`
- Discussion: Terminal conversation on 2025-11-17
