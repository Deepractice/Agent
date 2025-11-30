# @deepractice-ai/agentx-logger

**SLF4J-style logging facade for AgentX with TypeScript decorator support.**

## Features

- 🎯 **SLF4J-style API** - Familiar logging facade pattern
- 🎨 **Decorator Support** - `@Logger()` property decorator for easy injection
- 🏭 **LoggerFactory** - Centralized logger management
- 🔌 **Pluggable** - Implement `LoggerProvider` to use any logging library
- 🪶 **Zero Dependencies** - Lightweight core
- 📊 **Log Levels** - DEBUG, INFO, WARN, ERROR, SILENT
- 🎨 **Colored Output** - Beautiful console logs with timestamps

## Installation

```bash
pnpm add @deepractice-ai/agentx-logger
```

## Quick Start

### createLogger API (Recommended for Functions/Modules)

```typescript
import { createLogger } from "@deepractice-ai/agentx-logger";

// Simple usage
const logger = createLogger("MyModule");
logger.info("Module started");
logger.debug("Details", { key: "value" });

// In utility functions
function processData(data: any) {
  const logger = createLogger("utils/processData");
  logger.info("Processing data", { size: data.length });
}

// In facade functions
export function createAgent(id: string) {
  const logger = createLogger("facade/createAgent");
  logger.info("Creating agent", { id });
}
```

### LoggerFactory Style (SLF4J-like for Classes)

```typescript
import { LoggerFactory } from "@deepractice-ai/agentx-logger";

class MyService {
  // Get logger by class
  private logger = LoggerFactory.getLogger(MyService);

  doSomething() {
    this.logger.info("Hello from factory");
  }
}

// Or get logger by name
const logger = LoggerFactory.getLogger("MyModule");
logger.info("Module started");
```

### Decorator Style (Requires TypeScript Decorators)

```typescript
import { Logger, LoggerProvider } from "@deepractice-ai/agentx-logger";

class MyService {
  @Logger()
  private logger!: LoggerProvider;

  doSomething() {
    this.logger.info("Hello from MyService");
    this.logger.debug("Debug info", { userId: 123 });
    this.logger.warn("Warning message");
    this.logger.error("Error occurred", { error: "details" });
  }
}
```

**Enable decorators in `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Configuration

### Global Configuration

```typescript
import { LoggerFactory, LogLevel } from "@deepractice-ai/agentx-logger";

// Configure default log level and options
LoggerFactory.configure({
  defaultLevel: LogLevel.DEBUG,
  consoleOptions: {
    colors: true,
    timestamps: true,
  },
});
```

### Custom Logger Name

```typescript
class MyService {
  @Logger({ name: "CustomLogger" })
  private logger!: LoggerProvider;
}
```

## Log Levels

```typescript
import { LogLevel } from "@deepractice-ai/agentx-logger";

// Available levels
LogLevel.DEBUG; // 0 - Most verbose
LogLevel.INFO; // 1 - Default
LogLevel.WARN; // 2
LogLevel.ERROR; // 3
LogLevel.SILENT; // 4 - No logs
```

## Advanced Usage

### Custom Logger Implementation

Implement `LoggerProvider` to use your own logging library:

```typescript
import { LoggerProvider, LogLevel, LogContext } from "@deepractice-ai/agentx-logger";
import pino from "pino";

class PinoLogger implements LoggerProvider {
  readonly name: string;
  readonly level: LogLevel;
  private pino: pino.Logger;

  constructor(name: string) {
    this.name = name;
    this.level = LogLevel.INFO;
    this.pino = pino({ name });
  }

  debug(message: string, context?: LogContext): void {
    this.pino.debug(context, message);
  }

  info(message: string, context?: LogContext): void {
    this.pino.info(context, message);
  }

  warn(message: string, context?: LogContext): void {
    this.pino.warn(context, message);
  }

  error(message: string | Error, context?: LogContext): void {
    if (message instanceof Error) {
      this.pino.error({ err: message, ...context }, message.message);
    } else {
      this.pino.error(context, message);
    }
  }

  isDebugEnabled(): boolean {
    return this.level <= LogLevel.DEBUG;
  }
  isInfoEnabled(): boolean {
    return this.level <= LogLevel.INFO;
  }
  isWarnEnabled(): boolean {
    return this.level <= LogLevel.WARN;
  }
  isErrorEnabled(): boolean {
    return this.level <= LogLevel.ERROR;
  }
}

// Configure factory to use custom implementation
LoggerFactory.configure({
  defaultImplementation: (name) => new PinoLogger(name),
});
```

### Testing with NoOpLogger

```typescript
import { NoOpLogger } from "@deepractice-ai/agentx-logger";

// Disable logging in tests
const logger = new NoOpLogger();
logger.info("This will not be logged");
```

## API Reference

### LoggerProvider Interface

```typescript
interface LoggerProvider {
  readonly name: string;
  readonly level: LogLevel;

  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string | Error, context?: LogContext): void;

  isDebugEnabled(): boolean;
  isInfoEnabled(): boolean;
  isWarnEnabled(): boolean;
  isErrorEnabled(): boolean;
}
```

### LoggerFactory

```typescript
class LoggerFactory {
  static getLogger(nameOrClass: string | Function): LoggerProvider;
  static configure(config: LoggerFactoryConfig): void;
  static reset(): void;
  static getLoggerNames(): string[];
}
```

### @Logger() Decorator

```typescript
function Logger(options?: LoggerOptions): PropertyDecorator;

interface LoggerOptions {
  name?: string; // Custom logger name (defaults to class name)
}
```

## Examples

### Basic Usage

```typescript
import { Logger, LoggerProvider } from "@deepractice-ai/agentx-logger";

class UserService {
  @Logger()
  private logger!: LoggerProvider;

  async createUser(name: string) {
    this.logger.info("Creating user", { name });

    try {
      // Create user logic
      this.logger.debug("User created successfully");
    } catch (error) {
      this.logger.error(error as Error, { name });
      throw error;
    }
  }
}
```

### With AgentX

```typescript
import { createAgentX, defineAgent } from "@deepractice-ai/agentx";
import { Logger, LoggerProvider } from "@deepractice-ai/agentx-logger";

class MyDriver implements AgentDriver {
  @Logger()
  private logger!: LoggerProvider;

  async *receive(message) {
    this.logger.info("Processing message");
    // Driver implementation
  }
}
```

## Related Packages

- **[@deepractice-ai/agentx-types](../agentx-types)** - Logger interface definitions
- **[@deepractice-ai/agentx-agent](../agentx-agent)** - Uses logger for agent lifecycle logging
- **[@deepractice-ai/agentx-engine](../agentx-engine)** - Uses logger for event processing

## License

MIT
