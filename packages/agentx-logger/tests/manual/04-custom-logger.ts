/**
 * Test 4: Custom Logger Implementation
 *
 * Tests implementing a custom LoggerProvider (similar to Pino/Winston adapters).
 */

import { LoggerFactory, type LoggerProvider, LogLevel, type LogContext } from "../../src";

console.log("\n=== Test 4: Custom Logger Implementation ===\n");

/**
 * Simple JSON logger that outputs structured logs
 */
class JsonLogger implements LoggerProvider {
  readonly name: string;
  readonly level: LogLevel;

  constructor(name: string) {
    this.name = name;
    this.level = LogLevel.DEBUG;
  }

  private log(level: string, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      ...context,
    };
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDebugEnabled()) {
      this.log("DEBUG", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isInfoEnabled()) {
      this.log("INFO", message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isWarnEnabled()) {
      this.log("WARN", message, context);
    }
  }

  error(message: string | Error, context?: LogContext): void {
    if (this.isErrorEnabled()) {
      if (message instanceof Error) {
        this.log("ERROR", message.message, {
          ...context,
          errorName: message.name,
          stack: message.stack,
        });
      } else {
        this.log("ERROR", message, context);
      }
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
  defaultImplementation: (name) => new JsonLogger(name),
});

// Test with class using LoggerFactory
class AnalyticsService {
  private logger = LoggerFactory.getLogger(AnalyticsService);

  trackEvent(eventName: string, properties: Record<string, unknown>) {
    this.logger.info("Event tracked", { eventName, properties });
  }

  trackError(error: Error) {
    this.logger.error(error, { service: "analytics" });
  }
}

// Test with factory
const metricsLogger = LoggerFactory.getLogger("Metrics");
metricsLogger.info("Recording metric", {
  metric: "api.response_time",
  value: 123,
  unit: "ms",
});

metricsLogger.debug("Metric details", {
  endpoint: "/api/users",
  method: "GET",
});

// Run tests
const analyticsService = new AnalyticsService();
analyticsService.trackEvent("user_signup", {
  userId: "user_123",
  source: "web",
});

analyticsService.trackError(new Error("Analytics tracking failed"));

// Reset to default ConsoleLogger
LoggerFactory.reset();

console.log("\n✅ Test 4 passed\n");
