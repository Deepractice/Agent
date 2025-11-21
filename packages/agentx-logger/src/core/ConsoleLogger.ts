/**
 * ConsoleLogger
 *
 * Default console-based logger implementation.
 * Outputs formatted logs to console with timestamps and colors.
 */

import { LoggerProvider, LogLevel, type LogContext } from "~/types";

/**
 * ConsoleLogger options
 */
export interface ConsoleLoggerOptions {
  /**
   * Minimum log level (default: INFO)
   */
  level?: LogLevel;

  /**
   * Enable colored output (default: true for Node.js)
   */
  colors?: boolean;

  /**
   * Enable timestamps (default: true)
   */
  timestamps?: boolean;
}

/**
 * ConsoleLogger implementation
 *
 * Simple console-based logger with formatting support.
 */
export class ConsoleLogger implements LoggerProvider {
  readonly name: string;
  readonly level: LogLevel;
  private readonly colors: boolean;
  private readonly timestamps: boolean;

  // ANSI color codes
  private static readonly COLORS = {
    DEBUG: "\x1b[36m", // Cyan
    INFO: "\x1b[32m", // Green
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
    RESET: "\x1b[0m",
  };

  constructor(name: string, options: ConsoleLoggerOptions = {}) {
    this.name = name;
    this.level = options.level ?? LogLevel.INFO;
    this.colors = options.colors ?? this.isNodeEnvironment();
    this.timestamps = options.timestamps ?? true;
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
        this.log("ERROR", message.message, { ...context, stack: message.stack });
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

  /**
   * Core logging method
   */
  private log(level: string, message: string, context?: LogContext): void {
    const parts: string[] = [];

    // Timestamp
    if (this.timestamps) {
      parts.push(this.formatTimestamp());
    }

    // Level (with color)
    if (this.colors) {
      const color = ConsoleLogger.COLORS[level as keyof typeof ConsoleLogger.COLORS];
      parts.push(`${color}${level.padEnd(5)}${ConsoleLogger.COLORS.RESET}`);
    } else {
      parts.push(level.padEnd(5));
    }

    // Logger name
    parts.push(`[${this.name}]`);

    // Message
    parts.push(message);

    // Output
    const logLine = parts.join(" ");
    const consoleMethod = this.getConsoleMethod(level);

    if (context && Object.keys(context).length > 0) {
      consoleMethod(logLine, context);
    } else {
      consoleMethod(logLine);
    }
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Get appropriate console method
   */
  private getConsoleMethod(level: string): (...args: any[]) => void {
    switch (level) {
      case "DEBUG":
        return console.debug.bind(console);
      case "INFO":
        return console.info.bind(console);
      case "WARN":
        return console.warn.bind(console);
      case "ERROR":
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  /**
   * Check if running in Node.js environment
   */
  private isNodeEnvironment(): boolean {
    return typeof process !== "undefined" && process.versions?.node !== undefined;
  }
}
