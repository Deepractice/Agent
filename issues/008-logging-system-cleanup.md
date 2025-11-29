# Issue 008: Logging System Cleanup and Unification

**Status**: Open
**Priority**: Medium
**Created**: 2025-01-22

## Problem

The project has a well-designed logging facade (`agentx-logger`) but logging usage across packages is inconsistent and chaotic. There are direct `console.*` calls scattered throughout the codebase, and the frontend uses a separate `WebSocketLogger` implementation that is not unified with the backend logging system.

## Current Architecture

### agentx-logger (Good Design)

```
agentx-logger (SLF4J-style facade)
├── LoggerProvider (core interface)
│   └── 4 log methods: debug(), info(), warn(), error()
│   └── 4 check methods: isDebugEnabled(), isInfoEnabled(), etc.
├── LoggerFactory (singleton factory)
├── ConsoleLogger (default implementation)
├── NoOpLogger (for testing)
└── API layer
    ├── @Logger() decorator
    ├── createLogger() function
    └── LoggerFactory.getLogger()
```

### Dual Logging System Problem

```
Backend (Node.js): agentx-logger ← Standard
Frontend (Browser): WebSocketLogger ← Custom, inconsistent
```

## Issues Found

### High Priority

#### 1. SSEReactor hardcoded console calls

**Location**: `packages/agentx-framework/src/server/SSEReactor.ts`

```typescript
// 8 instances of console.* in core framework code
console.log(`[SSEReactor sendEvent] Event type: ${event.type}, ...`);
console.warn(`[SSEReactor] Cannot send event - SSE session disconnected`);
console.error("[SSEReactor] Failed to send event:", {...});
console.log("[SSEReactor] Initialized", {...});
// ... more
```

**Problem**: Core framework code should use `createLogger()`, not hardcoded console calls.

#### 2. WebSocketLogger calls console.\* internally

**Location**: `packages/agentx-ui/dev-tools/WebSocketLogger.ts`

```typescript
// Lines 65, 78, 85, 88
console.log(`[WebSocketLogger] Connected to ${this.wsUrl}`);
console.log("[WebSocketLogger] Disconnected from log collector");
console.error("[WebSocketLogger] WebSocket error:", error);
console.error("[WebSocketLogger] Failed to connect:", error);
```

**Problem**: A logging library implementation should not call `console.*` directly. This creates potential circular issues and bypasses the logging facade.

### Medium Priority

#### 3. agentx-web server console.error

**Location**: `apps/agentx-web/server/index.ts`

```typescript
// Line 89
console.error("[Static Server] Error serving file:", error);
```

**Problem**: Should use `createLogger()` instead.

### Low Priority

#### 4. eventBus debug console.log

**Location**: `packages/agentx-ui/src/utils/eventBus.ts`

```typescript
// Lines 51, 90, 100
console.log("[EventBus]", type, data); // debugMode conditional
console.log("[EventBus] Debug mode enabled");
console.log("[EventBus] Debug mode disabled");
```

**Problem**: Even with debug mode check, should use logger library.

#### 5. Story files (Acceptable)

**Location**: `packages/agentx-ui/src/components/chat/*.stories.tsx`

Console calls in Storybook story files are acceptable for demo purposes.

## Additional Issue: LOG_LEVEL Environment Variable Not Used

`turbo.json` defines `LOG_LEVEL` in `globalEnv`, but there is no initialization code that reads this environment variable and configures `LoggerFactory`.

```json
// turbo.json
{
  "globalEnv": [
    "LOG_LEVEL" // Defined but not used
  ]
}
```

## Proposed Solution

### 1. Unify Frontend and Backend Logging

Option A: Make `WebSocketLogger` a wrapper around `agentx-logger`
Option B: Create browser-compatible build of `agentx-logger`

### 2. Replace All console.\* Calls in Non-Story Code

```typescript
// Before
console.log("[SSEReactor] Initialized");

// After
import { createLogger } from "@deepractice-ai/agentx-logger";
const logger = createLogger("framework/SSEReactor");
logger.info("Initialized");
```

### 3. Add LOG_LEVEL Initialization

```typescript
// In app initialization
import { LoggerFactory, LogLevel } from "@deepractice-ai/agentx-logger";

const levelFromEnv = process.env.LOG_LEVEL?.toUpperCase();
if (levelFromEnv && levelFromEnv in LogLevel) {
  LoggerFactory.configure({ defaultLevel: LogLevel[levelFromEnv] });
}
```

### 4. Fix WebSocketLogger

Remove internal `console.*` calls or use callbacks/events instead.

## Files to Modify

| File                                                 | Action                                     |
| ---------------------------------------------------- | ------------------------------------------ |
| `packages/agentx-framework/src/server/SSEReactor.ts` | Replace 8 console.\* with createLogger()   |
| `packages/agentx-ui/dev-tools/WebSocketLogger.ts`    | Remove internal console.\* calls           |
| `apps/agentx-web/server/index.ts`                    | Replace console.error with createLogger()  |
| `packages/agentx-ui/src/utils/eventBus.ts`           | Replace console.log with logger            |
| New file: initialization code                        | Add LOG_LEVEL environment variable reading |

## Acceptance Criteria

- [ ] No `console.*` calls in core packages (except Story files)
- [ ] Unified logging API for frontend and backend
- [ ] `LOG_LEVEL` environment variable controls log output
- [ ] All logs go through `agentx-logger` facade

## Related

- `packages/agentx-logger/` - Core logging implementation
- `packages/agentx-ui/dev-tools/WebSocketLogger.ts` - Frontend logging
- `turbo.json` - Environment variable definitions
