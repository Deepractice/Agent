# Logger Configuration Feature

## Overview

Added unified `configure()` API to AgentX framework for global configuration, starting with logger implementation support.

## Changes

### New Package: `@deepractice-ai/agentx-logger`

- **SLF4J-style** logging facade for AgentX ecosystem
- Three usage patterns:
  - `@Logger()` decorator for classes
  - `LoggerFactory.getLogger()` for SLF4J-style usage
  - `createLogger()` for functions and modules
- Default implementation: `ConsoleLogger` with colors and timestamps
- Built-in implementations: `ConsoleLogger`, `NoOpLogger`
- Extensible: Users can provide custom logger implementations

### Core Logging Integration

All `agentx-core` components now have structured logging:

**Facade Layer**:

- `createAgent()`: INFO logs for agent creation
- `createDriver()`: INFO/DEBUG logs for driver lifecycle

**Core Components**:

- `AgentServiceImpl`: INFO/WARN/ERROR/DEBUG logs
- `AgentEngine`: INFO/DEBUG logs
- `AgentEventBus`: WARN/ERROR/DEBUG logs
- `AgentReactorRegistry`: INFO/WARN/ERROR/DEBUG logs

**Core Reactors**:

- `AgentDriverBridge`: INFO/ERROR/DEBUG logs
- `AgentStateMachine`: INFO/DEBUG logs
- `AgentExchangeTracker`: DEBUG logs
- `AgentMessageAssembler`: WARN/ERROR/DEBUG logs

**Log Levels**:

- `DEBUG (0)`: Internal state changes, detailed flow
- `INFO (1)`: Major operations (create, initialize, destroy)
- `WARN (2)`: Recoverable issues, warnings
- `ERROR (3)`: Failures, exceptions, critical errors

### Framework Configuration API

New `configure()` function in `@deepractice-ai/agentx-framework`:

```typescript
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";

configure({
  logger: {
    defaultLevel: LogLevel.DEBUG,
    defaultImplementation: (name) => new PinoLogger(name),
    consoleOptions: { colors: true, timestamps: true },
  },
});
```

**Exported from framework**:

- `configure(config: AgentXConfig)` - Global configuration function
- `LogLevel` enum - Log level constants
- `LoggerFactory` - Direct factory access (advanced usage)
- `LoggerProvider` interface - For custom implementations
- `LogContext` type - Structured log context
- `LoggerFactoryConfig` type - Logger configuration type

### Updated Files

**New Files**:

- `packages/agentx-logger/` - Complete logger package
- `packages/agentx-framework/src/configure.ts` - Configuration API
- `docs/configure-logger.md` - Usage guide

**Modified Files**:

- `packages/agentx-core/package.json` - Added agentx-logger dependency
- `packages/agentx-framework/package.json` - Added agentx-logger dependency
- `packages/agentx-framework/src/index.ts` - Export configure API
- All core components - Replaced console.\* with logger calls
- `packages/agentx-ui/server/dev-server.ts` - Added configure example

## Usage Examples

### Development Mode

```typescript
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";

configure({
  logger: {
    defaultLevel: LogLevel.DEBUG,
    consoleOptions: { colors: true, timestamps: true },
  },
});
```

### Production with Pino

```typescript
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";
import pino from "pino";

class PinoLoggerAdapter implements LoggerProvider {
  private logger: pino.Logger;
  constructor(public name: string) {
    this.logger = pino({ name });
  }
  // ... implement LoggerProvider interface
}

configure({
  logger: {
    defaultLevel: LogLevel.INFO,
    defaultImplementation: (name) => new PinoLoggerAdapter(name),
  },
});
```

### Test Mode

```typescript
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";

configure({
  logger: {
    defaultLevel: LogLevel.SILENT,
  },
});
```

## Architecture

### Layer Separation

- **agentx-logger**: Logging abstraction (interfaces + default implementations)
- **agentx-core**: Uses logger via `createLogger()` function
- **agentx-framework**: Provides `configure()` API for user configuration

### Global Configuration Pattern

Similar to Node.js ecosystem patterns:

- **Winston**: `winston.configure()`
- **Log4js**: `log4js.configure()`
- **Debug**: `DEBUG=*` environment variable

AgentX follows this pattern with `configure()` API.

## Benefits

1. **Unified Configuration**: Single entry point for framework-level settings
2. **Platform Flexibility**: Different platforms can use different logger implementations
3. **Structured Logging**: All logs include context objects for better analysis
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Extensibility**: Easy to add custom logger implementations
6. **Future-Ready**: `configure()` can support more framework settings

## Migration Guide

### Before (Direct console usage)

```typescript
console.log("Creating agent");
const agent = createAgent(id, driver);
```

### After (Automatic logging)

```typescript
// Configure once in application entry
import { configure, LogLevel } from "@deepractice-ai/agentx-framework";

configure({
  logger: { defaultLevel: LogLevel.INFO },
});

// All subsequent agent operations use configured logger
const agent = createAgent(id, driver);
// Logs: "Creating agent" with structured context
```

## Future Enhancements

The `configure()` API is designed for extension:

```typescript
configure({
  logger: { ... },

  // Future features:
  errorHandler: (error) => Sentry.captureException(error),
  performance: { enabled: true, sampleRate: 0.1 },
  debug: true
});
```

## Related Documentation

- [Logger Configuration Guide](../configure-logger.md)
- [AgentX Logger API](../../packages/agentx-logger/README.md)
