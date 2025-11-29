# Logger Configuration Guide

## Overview

AgentX framework provides a unified `configure()` API for global configuration, including logger implementation.

## Basic Usage

### Development Mode (Default ConsoleLogger)

```typescript
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";

// In your application entry point (index.ts, main.ts, etc.)
configure({
  logger: {
    defaultLevel: LogLevel.DEBUG,
    consoleOptions: {
      colors: true,
      timestamps: true
    }
  }
});

// Then create agents - they will use the configured logger
const agent = MyAgent.create({ ... });
```

### Production Mode (Custom Logger)

```typescript
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
import pino from "pino";

// Custom logger adapter
class PinoLoggerAdapter implements LoggerProvider {
  private logger: pino.Logger;

  constructor(public name: string) {
    this.logger = pino({ name });
  }

  get level() {
    return LogLevel.INFO;
  }

  debug(message: string, context?: any) {
    this.logger.debug(context, message);
  }

  info(message: string, context?: any) {
    this.logger.info(context, message);
  }

  warn(message: string, context?: any) {
    this.logger.warn(context, message);
  }

  error(message: string | Error, context?: any) {
    this.logger.error(context, message);
  }

  isDebugEnabled() {
    return this.logger.isLevelEnabled("debug");
  }
  isInfoEnabled() {
    return this.logger.isLevelEnabled("info");
  }
  isWarnEnabled() {
    return this.logger.isLevelEnabled("warn");
  }
  isErrorEnabled() {
    return this.logger.isLevelEnabled("error");
  }
}

// Configure to use Pino
configure({
  logger: {
    defaultLevel: LogLevel.INFO,
    defaultImplementation: (name) => new PinoLoggerAdapter(name),
  },
});
```

### Test Mode (Silent Logger)

```typescript
import { configure, LogLevel, NoOpLogger } from "@deepractice-ai/agentx-framework";

configure({
  logger: {
    defaultLevel: LogLevel.SILENT,
    defaultImplementation: (name) => new NoOpLogger(),
  },
});
```

## Platform-Specific Configuration

### Node.js Server

```typescript
// server/index.ts
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
import pino from "pino";

configure({
  logger: {
    defaultLevel: process.env.LOG_LEVEL === "debug" ? LogLevel.DEBUG : LogLevel.INFO,
    defaultImplementation: (name) => new PinoLoggerAdapter(name),
  },
});
```

### Browser Application

```typescript
// app/main.ts
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";

// Custom browser logger that sends logs to server
class BrowserLogger implements LoggerProvider {
  constructor(
    public name: string,
    private serverUrl: string = "/api/logs"
  ) {}

  async sendToServer(level: string, message: string, context?: any) {
    if (navigator.sendBeacon) {
      const data = JSON.stringify({ level, message, context, name: this.name });
      navigator.sendBeacon(this.serverUrl, data);
    }
  }

  // ... implement LoggerProvider interface
}

configure({
  logger: {
    defaultLevel: LogLevel.INFO,
    defaultImplementation: (name) => new BrowserLogger(name, "/api/logs"),
    consoleOptions: {
      colors: true,
      timestamps: false, // Browsers handle timestamps
    },
  },
});
```

## Environment-Based Configuration

```typescript
// config/logger.ts
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
import { PinoLoggerAdapter } from "./adapters/PinoLogger";
import { SentryLogger } from "./adapters/SentryLogger";

const env = process.env.NODE_ENV || "development";

switch (env) {
  case "development":
    configure({
      logger: {
        defaultLevel: LogLevel.DEBUG,
        consoleOptions: { colors: true, timestamps: true },
      },
    });
    break;

  case "production":
    configure({
      logger: {
        defaultLevel: LogLevel.INFO,
        defaultImplementation: (name) => new PinoLoggerAdapter(name),
      },
    });
    break;

  case "test":
    configure({
      logger: {
        defaultLevel: LogLevel.SILENT,
      },
    });
    break;
}
```

## Log Levels

```typescript
enum LogLevel {
  DEBUG = 0, // Detailed debugging information
  INFO = 1, // General informational messages
  WARN = 2, // Warning messages
  ERROR = 3, // Error messages
  SILENT = 4, // No logging
}
```

## Important Notes

1. **Call configure() early**: Must be called before creating any agents
2. **Call only once**: Global configuration, typically in application entry point
3. **All agents use same config**: Configuration applies to all AgentX components
4. **Default is ConsoleLogger**: If not configured, uses ConsoleLogger with INFO level

## Example: Complete Application Setup

```typescript
// index.ts - Application entry point
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
import { MyAgent } from "./agents/MyAgent";

// 1. Configure framework first
configure({
  logger: {
    defaultLevel: LogLevel.INFO,
    consoleOptions: {
      colors: true,
      timestamps: true,
    },
  },
});

// 2. Then create and use agents
async function main() {
  const agent = MyAgent.create({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  await agent.initialize();
  await agent.send("Hello!");

  // All internal logging uses configured logger:
  // - AgentEngine: INFO level logs
  // - AgentEventBus: DEBUG level logs
  // - Core Reactors: DEBUG/INFO level logs
}

main().catch(console.error);
```

## Advanced: Direct LoggerFactory Access

If you need more control, you can use LoggerFactory directly:

```typescript
import { LoggerFactory, LogLevel } from "@deepractice-ai/agentx-framework";

// Same as configure({ logger: { ... } })
LoggerFactory.configure({
  defaultLevel: LogLevel.DEBUG,
  defaultImplementation: (name) => new MyLogger(name),
});

// Get logger manually
const logger = LoggerFactory.getLogger("MyModule");
logger.info("Custom log");

// Reset all loggers
LoggerFactory.reset();
```
