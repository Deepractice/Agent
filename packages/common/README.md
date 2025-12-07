# @agentxjs/common

> Shared infrastructure for AgentX internal packages

## Overview

`@agentxjs/common` provides shared utilities used by AgentX internal packages (`@agentxjs/agent`, `@agentxjs/runtime`, etc.). This is an internal package - application code should not depend on it directly.

**Key Features:**

- **Logger Facade** - Lazy-initialized logging with pluggable backends
- **Zero Runtime Overhead** - Safe to use at module level
- **Pluggable Architecture** - Custom loggers via Runtime injection

## Installation

```bash
pnpm add @agentxjs/common
```

> **Note**: This package is typically installed transitively as a dependency of other AgentX packages.

---

## Logger

### Quick Start

```typescript
import { createLogger } from "@agentxjs/common";

// Safe to use at module level (before Runtime configured)
const logger = createLogger("agent/AgentEngine");

// Later, at runtime
logger.info("Agent created", { agentId: "agent_123" });
logger.debug("Processing message", { messageId: "msg_456" });
logger.error("Failed to process", { error: err.message });
```

### Features

#### 1. Lazy Initialization

Loggers can be created at module level without errors:

```typescript
// At module level (before Runtime exists)
const logger = createLogger("engine/MealyMachine");

// No-op until LoggerFactory is configured
logger.info("This is buffered");

// Later, when Runtime initializes
setLoggerFactory(new LoggerFactoryImpl());

// Now logs are emitted
logger.info("This is logged");
```

#### 2. Structured Logging

All loggers support structured context:

```typescript
logger.info("User logged in", {
  userId: "user_123",
  timestamp: Date.now(),
  ip: "192.168.1.1",
});

// Output (with ConsoleLogger):
// [INFO] agent/UserService: User logged in {"userId":"user_123",...}
```

#### 3. Log Levels

Supported log levels (in order of severity):

```typescript
logger.debug("Detailed debug info"); // Development only
logger.info("Normal operation"); // General info
logger.warn("Warning condition"); // Potential issues
logger.error("Error occurred"); // Errors
```

### API

#### `createLogger(category: string): Logger`

Creates a new logger instance.

```typescript
const logger = createLogger("agent/MyAgent");
```

**Parameters:**

- `category` - Logger category (e.g., `"engine/AgentEngine"`, `"runtime/Container"`)

**Returns:** `Logger` instance

#### `setLoggerFactory(factory: LoggerFactory): void`

Sets the global logger factory (called by Runtime).

```typescript
import { LoggerFactoryImpl, setLoggerFactory } from "@agentxjs/common";

setLoggerFactory(
  new LoggerFactoryImpl({
    level: "debug",
    enableTimestamp: true,
  })
);
```

### Logger Interface

```typescript
interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

type LogContext = Record<string, unknown>;
```

---

## Built-in Implementations

### ConsoleLogger

Default console-based logger with formatting.

```typescript
import { ConsoleLogger } from "@agentxjs/common";

const logger = new ConsoleLogger("my-category", {
  level: "debug",
  enableTimestamp: true,
  enableColor: true,
});

logger.info("Hello", { foo: "bar" });
// Output: [INFO] my-category: Hello {"foo":"bar"}
```

**Options:**

```typescript
interface ConsoleLoggerOptions {
  level?: LogLevel; // Minimum log level (default: "info")
  enableTimestamp?: boolean; // Show timestamps (default: false)
  enableColor?: boolean; // Colorize output (default: true in TTY)
}
```

### LoggerFactoryImpl

Default factory that creates `ConsoleLogger` instances.

```typescript
import { LoggerFactoryImpl } from "@agentxjs/common";

const factory = new LoggerFactoryImpl({
  level: "info",
  enableTimestamp: false,
});

const logger = factory.createLogger("test");
```

---

## Custom Logger Implementation

You can provide custom loggers for advanced use cases:

```typescript
import { Logger, LoggerFactory, setLoggerFactory } from "@agentxjs/common";

// Custom logger (e.g., sends logs to external service)
class RemoteLogger implements Logger {
  constructor(private category: string) {}

  debug(message: string, context?: LogContext) {
    this.send("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.send("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.send("warn", message, context);
  }

  error(message: string, context?: LogContext) {
    this.send("error", message, context);
  }

  private send(level: string, message: string, context?: LogContext) {
    fetch("/api/logs", {
      method: "POST",
      body: JSON.stringify({ level, category: this.category, message, context }),
    });
  }
}

// Custom factory
class RemoteLoggerFactory implements LoggerFactory {
  createLogger(category: string): Logger {
    return new RemoteLogger(category);
  }
}

// Use custom factory
setLoggerFactory(new RemoteLoggerFactory());
```

---

## Design Decisions

### Why Lazy Initialization?

AgentX packages create loggers at module level:

```typescript
// engine/AgentEngine.ts
import { createLogger } from "@agentxjs/common";

const logger = createLogger("engine/AgentEngine");

export class AgentEngine {
  // ...
}
```

If loggers required immediate factory, this would fail before Runtime initializes. Lazy initialization solves this.

### Why Pluggable?

Different environments need different logging:

- **Development** - Console with colors
- **Production** - Structured JSON logs
- **Browser** - Send to analytics service
- **Testing** - Silent or mock

Runtime provides the logger factory appropriate for the environment.

### Why Not Use console.log Directly?

Direct `console.log` usage causes:

1. **No control** - Can't disable/filter logs
2. **No structure** - Context is hard to parse
3. **No routing** - Can't send logs to services

The logger facade solves all these issues.

---

## Package Dependencies

```text
@agentxjs/types     Type definitions
       ↑
@agentxjs/common    This package (logger facade)
       ↑
@agentxjs/agent     Uses logger
       ↑
@agentxjs/runtime   Uses logger + provides factory
```

---

## Related Packages

- **[@agentxjs/types](../types)** - Type definitions
- **[@agentxjs/agent](../agent)** - Agent runtime (uses logger)
- **[@agentxjs/runtime](../runtime)** - Runtime implementation (provides factory)

---

## License

MIT
