# Issue #003: Claude SDK Error Messages Misidentified as Assistant Messages

**Status**: 🔴 Critical Bug
**Priority**: High
**Created**: 2025-11-17
**Assignee**: TBD
**Labels**: `bug`, `driver`, `error-handling`, `claude-sdk`

---

## Problem

When Claude SDK encounters an error (e.g., invalid API key), the error message is **incorrectly displayed as a normal Assistant message** instead of an Error message.

### User Impact

Users see confusing messages like:

```
Agent: Invalid API key · Fix external API key
```

Instead of a proper error display with:

- Red error styling
- Error icon
- Clear indication that this is an error, not a response

---

## Reproduction Steps

1. Configure system with **invalid API key** in `.env.test`:

   ```bash
   ANTHROPIC_API_KEY=invalid_key_here
   ```

2. Start dev server:

   ```bash
   pnpm dev:server
   ```

3. Send any message in Storybook UI

4. **Observe**: Error message appears as normal agent response with robot icon 🤖

5. **Expected**: Error message should appear with error styling and error icon 🚨

---

## Root Cause Analysis

### Event Flow (Current - WRONG)

```
1. User sends "你好"
   ↓
2. ClaudeSDKDriver calls Claude SDK
   ↓
3. Claude SDK encounters error (invalid API key)
   ↓
4. ❌ SDK yields NORMAL message events:
   - message_start
   - text_content_block_start
   - text_delta: "Invalid API key · Fix external API key"
   - text_content_block_stop
   - message_stop
   ↓
5. AgentMessageAssembler receives these events
   ↓
6. ❌ Emits assistant_message (role: "assistant")
   {
     type: "assistant_message",
     data: {
       id: "msg_xxx",
       role: "assistant",  // ❌ WRONG - should be "error"
       content: "Invalid API key · Fix external API key"
     }
   }
   ↓
7. UI displays with robot icon 🤖 (assistant style)
   ↓
8. THEN SDK throws exception:
   Error: Claude Code process exited with code 1
   ↓
9. DriverReactor catches and emits error_message
   {
     type: "error_message",
     data: {
       role: "error",
       message: "Claude Code process exited with code 1",
       code: "DRIVER_ERROR"
     }
   }
   ↓
10. ✅ This error IS displayed correctly
```

**Result**: User sees TWO messages:

1. ❌ "Invalid API key" as Assistant message (WRONG)
2. ✅ "Claude Code process exited with code 1" as Error message (CORRECT)

But the first message is what the user needs to see!

---

## Server Logs (Evidence)

```
[DriverReactor.handleUserMessage] Starting to iterate driver stream

# ❌ These are emitted as NORMAL stream events
[DriverReactor.handleUserMessage] Received stream event #1: message_start
[DriverReactor.handleUserMessage] Received stream event #2: text_content_block_start
[DriverReactor.handleUserMessage] Received stream event #3: text_delta
[DriverReactor.handleUserMessage] Received stream event #4: text_content_block_stop
[DriverReactor.handleUserMessage] Received stream event #5: message_stop

# ❌ Assembled as assistant_message!
[AgentMessageAssembler.onMessageStop] Emitting assistant_message event {
  content: 'Invalid API key · Fix external API key',
  contentLength: 38
}

# ✅ Then the real error is caught
[ClaudeSDKDriver] Error during SDK query: Error: Claude Code process exited with code 1
[DriverReactor.handleUserMessage] ========== ERROR ==========
[DriverReactor] Emitting error_message event
```

---

## Code Location

**File**: `packages/agentx-framework/src/drivers/ClaudeSDKDriver.ts`

**Problematic code** (lines 326-335):

```typescript
try {
  // 6. Call Claude SDK
  const result = query({ prompt, options });

  // 7. Transform SDK messages to Stream events
  yield * transformSDKMessages(result, builder); // ❌ Already yielded error as normal message
} catch (error) {
  console.error("[ClaudeSDKDriver] Error during SDK query:", error);
  throw error; // ❌ Only re-throws, doesn't handle the misidentified message
}
```

**Issue**:

- Claude SDK yields error content as normal `assistant` message type before throwing
- Driver blindly transforms all SDK messages without checking for error patterns
- By the time we catch the exception, the wrong message is already emitted

---

## Proposed Solutions

### Option 1: Error Pattern Detection in Driver ⭐ **Recommended**

Detect common error patterns in SDK response and convert to error events:

```typescript
// ClaudeSDKDriver.ts

// Add error detection helper
function isErrorMessage(content: string): boolean {
  const errorPatterns = [
    /invalid api key/i,
    /authentication failed/i,
    /unauthorized/i,
    /forbidden/i,
    /rate limit/i,
    /quota exceeded/i,
    /service unavailable/i,
  ];

  return errorPatterns.some((pattern) => pattern.test(content));
}

// Modify transformSDKMessages
async function* transformSDKMessages(
  sdkMessages: AsyncIterable<SDKMessage>,
  builder: StreamEventBuilder
): AsyncIterable<StreamEventType> {
  let messageContent = "";

  for await (const sdkMsg of sdkMessages) {
    switch (sdkMsg.type) {
      case "assistant":
        messageContent = extractTextContent(sdkMsg.message.content);

        // ✅ Check if this is actually an error
        if (isErrorMessage(messageContent)) {
          // Don't yield as normal message
          // Instead, throw error to be caught by try/catch
          throw new Error(`Claude SDK Error: ${messageContent}`);
        }

        // Normal processing...
        yield* processAssistantContent(sdkMsg, builder);
        break;

      // ... rest of cases
    }
  }
}
```

**Pros**:

- Fast to implement
- Catches errors before they're emitted as assistant messages
- No changes needed to Reactor layer

**Cons**:

- Requires maintaining error pattern list
- May miss new error formats

---

### Option 2: Message Context Tracking in DriverReactor

Track which messages were emitted, then retract them if an error occurs:

```typescript
// DriverReactor.ts

private async handleUserMessage(event: UserMessageEvent): Promise<void> {
  let emittedMessageIds: string[] = [];

  try {
    for await (const streamEvent of this.driver.sendMessage(event.data)) {
      // Track emitted messages
      if (streamEvent.type === "message_start") {
        emittedMessageIds.push(streamEvent.data.messageId);
      }

      context.producer.produce(streamEvent);
    }
  } catch (error) {
    // If error occurred after emitting messages, retract them
    for (const messageId of emittedMessageIds) {
      context.producer.produce({
        type: "retract_message",  // New event type
        messageId,
      });
    }

    this.emitErrorEvent(error, "llm", "error", "SDK_ERROR", true);
  }
}
```

**Pros**:

- Generic solution, works for all error types
- Doesn't require error pattern matching

**Cons**:

- Requires new event type `retract_message`
- More complex implementation
- UI needs to handle message retraction

---

### Option 3: Upstream Fix in Claude SDK

Report to Anthropic that SDK should emit error events instead of normal messages when failing.

**Pros**:

- Proper fix at source
- Benefits all SDK users

**Cons**:

- Out of our control
- Takes time
- May not be considered a bug by Anthropic

---

## Recommended Solution

**Use Option 1** (Error Pattern Detection) for immediate fix:

1. Add `isErrorMessage()` helper function
2. Detect error patterns in `transformSDKMessages()`
3. Throw error instead of yielding assistant message
4. Let existing error handling in DriverReactor catch it

**Implementation checklist**:

- [ ] Add error pattern detection helper
- [ ] Modify `transformSDKMessages` to check for errors
- [ ] Extract helper for text content extraction
- [ ] Add unit tests for error detection
- [ ] Test with invalid API key
- [ ] Test with rate limit error
- [ ] Test with network errors
- [ ] Update error pattern list based on real errors

---

## Testing Strategy

### Manual Testing

```bash
# Test 1: Invalid API key
ANTHROPIC_API_KEY=invalid pnpm dev:server
# Send message → Should show error with red styling

# Test 2: Rate limit (if possible)
# Spam requests → Should show rate limit error

# Test 3: Network error
# Disconnect network → Send message → Should show network error
```

### Unit Tests

```typescript
describe("ClaudeSDKDriver error handling", () => {
  it("should detect invalid API key error", () => {
    const content = "Invalid API key · Fix external API key";
    expect(isErrorMessage(content)).toBe(true);
  });

  it("should detect rate limit error", () => {
    const content = "Rate limit exceeded. Please try again later.";
    expect(isErrorMessage(content)).toBe(true);
  });

  it("should not flag normal responses as errors", () => {
    const content = "Hello! How can I help you today?";
    expect(isErrorMessage(content)).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe("Error message display", () => {
  it("should show API key error with error styling", async () => {
    // Mock Claude SDK to return error
    mockClaudeSDK.query.mockReturnValue(
      asyncIterator([{ type: "assistant", message: { content: "Invalid API key" } }])
    );

    await agent.send("test");

    const events = capturedEvents.filter((e) => e.type === "error_message");
    expect(events).toHaveLength(1);
    expect(events[0].data.message).toContain("Invalid API key");
  });
});
```

---

## Related Issues

- #002 - Message Direction Architecture (related to event flow)

---

## Impact

**Severity**: High

**Affected users**: All users when:

- Using invalid/expired API keys
- Hitting rate limits
- Experiencing service outages
- Any Claude SDK error

**User confusion**: High - Error messages look like normal responses, misleading users

---

## Success Criteria

After fix, when Claude SDK encounters an error:

✅ Error message displayed with red error styling
✅ Error icon shown (not robot icon)
✅ Message marked with `role: "error"`
✅ No duplicate error messages
✅ Proper error details available in UI
✅ User clearly understands this is an error, not a response

---

## Additional Notes

### Why Claude SDK Behaves This Way

Claude SDK is a wrapper around `claude-code` CLI process. When the CLI encounters an error:

1. It writes error message to stdout in normal message format
2. Then exits with non-zero code

This is likely intentional - the CLI wants to show a user-friendly error before exiting.

But for programmatic use (like our driver), we need to detect this pattern.

### Alternative: Check Exit Code

We could also detect errors by monitoring the subprocess exit code, but that's harder since we're using the SDK's high-level API.

---

## References

- ClaudeSDKDriver: `packages/agentx-framework/src/drivers/ClaudeSDKDriver.ts`
- DriverReactor: `packages/agentx-core/src/driver/DriverReactor.ts`
- AgentMessageAssembler: `packages/agentx-core/src/AgentMessageAssembler.ts`
- Error logs: Terminal output from 2025-11-17 debugging session
- Screenshot: [Image showing "Invalid API key" displayed as Agent message]
