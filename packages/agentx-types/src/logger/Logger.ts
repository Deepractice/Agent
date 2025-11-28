/**
 * Logger - Standard logging interface
 *
 * Platform-agnostic logging interface that can be implemented
 * by any logging library (console, pino, winston, etc.)
 *
 * Similar to SLF4J's Logger interface in Java.
 */

import type { LogLevel } from "./LogLevel";

/**
 * Logging context metadata
 */
export type LogContext = Record<string, unknown>;

/**
 * Logger interface
 *
 * All logger implementations must follow this interface.
 *
 * @example
 * ```typescript
 * class PinoLogger implements Logger {
 *   private pino: Pino.Logger;
 *
 *   constructor(name: string) {
 *     this.pino = pino({ name });
 *   }
 *
 *   get name() { return this.pino.name; }
 *   get level() { return LogLevel.DEBUG; }
 *
 *   debug(message: string, context?: LogContext) {
 *     this.pino.debug(context, message);
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface Logger {
  /**
   * Logger name (typically class name or module path)
   */
  readonly name: string;

  /**
   * Current log level
   */
  readonly level: LogLevel;

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log error message or Error object
   */
  error(message: string | Error, context?: LogContext): void;

  /**
   * Check if debug level is enabled
   */
  isDebugEnabled(): boolean;

  /**
   * Check if info level is enabled
   */
  isInfoEnabled(): boolean;

  /**
   * Check if warn level is enabled
   */
  isWarnEnabled(): boolean;

  /**
   * Check if error level is enabled
   */
  isErrorEnabled(): boolean;
}
