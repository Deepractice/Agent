/**
 * LoggerFactory
 *
 * Factory for creating and managing loggers (similar to SLF4J's LoggerFactory).
 * Provides centralized logger instance management and configuration.
 */

import { LoggerProvider, LogLevel } from "~/types";
import { ConsoleLogger, type ConsoleLoggerOptions } from "./ConsoleLogger";

/**
 * Logger factory configuration
 */
export interface LoggerFactoryConfig {
  /**
   * Default logger implementation
   * If not provided, uses ConsoleLogger
   */
  defaultImplementation?: (name: string) => LoggerProvider;

  /**
   * Default log level (default: INFO)
   */
  defaultLevel?: LogLevel;

  /**
   * Console logger options (if using default ConsoleLogger)
   */
  consoleOptions?: Omit<ConsoleLoggerOptions, "level">;
}

/**
 * LoggerFactory
 *
 * Central factory for creating and caching logger instances.
 * Similar to SLF4J's LoggerFactory.
 *
 * @example
 * ```typescript
 * // Get logger by class
 * const logger = LoggerFactory.getLogger(MyClass);
 *
 * // Get logger by name
 * const logger = LoggerFactory.getLogger("MyModule");
 *
 * // Configure factory
 * LoggerFactory.configure({
 *   defaultLevel: LogLevel.DEBUG,
 *   defaultImplementation: (name) => new PinoLogger(name)
 * });
 * ```
 */
export class LoggerFactory {
  private static loggers: Map<string, LoggerProvider> = new Map();
  private static config: LoggerFactoryConfig = {
    defaultLevel: LogLevel.INFO,
  };

  /**
   * Get logger instance by name or class
   *
   * @param nameOrClass - Logger name string or class constructor
   * @returns LoggerProvider instance
   *
   * @example
   * ```typescript
   * // By class
   * class MyService {
   *   private logger = LoggerFactory.getLogger(MyService);
   * }
   *
   * // By name
   * const logger = LoggerFactory.getLogger("MyModule");
   * ```
   */
  static getLogger(nameOrClass: string | Function): LoggerProvider {
    const name = typeof nameOrClass === "string" ? nameOrClass : nameOrClass.name;

    // Return cached logger if exists
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    // Create lazy logger proxy that resolves implementation on first use
    const lazyLogger = this.createLazyLogger(name);
    this.loggers.set(name, lazyLogger);
    return lazyLogger;
  }

  /**
   * Configure the logger factory
   *
   * @param config - Factory configuration
   *
   * @example
   * ```typescript
   * LoggerFactory.configure({
   *   defaultLevel: LogLevel.DEBUG,
   *   consoleOptions: { colors: true, timestamps: true }
   * });
   * ```
   */
  static configure(config: LoggerFactoryConfig): void {
    this.config = { ...this.config, ...config };
    // Note: No need to clear loggers anymore - lazy proxies will use new config automatically
  }

  /**
   * Get current configuration
   */
  static getConfig(): Readonly<LoggerFactoryConfig> {
    return { ...this.config };
  }

  /**
   * Clear all cached loggers
   */
  static reset(): void {
    this.loggers.clear();
    this.config = {
      defaultLevel: LogLevel.INFO,
    };
  }

  /**
   * Get all registered logger names
   */
  static getLoggerNames(): string[] {
    return Array.from(this.loggers.keys());
  }

  /**
   * Create lazy logger proxy
   *
   * Returns a proxy that delays actual logger creation until first use.
   * This ensures loggers always use the latest configuration, even if
   * configure() is called after createLogger().
   */
  private static createLazyLogger(name: string): LoggerProvider {
    // Cache for the actual logger instance (created lazily)
    let realLogger: LoggerProvider | null = null;

    // Get or create the real logger instance
    const getRealLogger = (): LoggerProvider => {
      if (!realLogger) {
        realLogger = this.createLogger(name);
      }
      return realLogger;
    };

    // Return proxy that delegates to real logger
    return {
      name,
      level: this.config.defaultLevel || LogLevel.INFO,

      debug: (message: string, context?: any) => {
        getRealLogger().debug(message, context);
      },

      info: (message: string, context?: any) => {
        getRealLogger().info(message, context);
      },

      warn: (message: string, context?: any) => {
        getRealLogger().warn(message, context);
      },

      error: (message: string | Error, context?: any) => {
        getRealLogger().error(message, context);
      },

      isDebugEnabled: () => getRealLogger().isDebugEnabled(),
      isInfoEnabled: () => getRealLogger().isInfoEnabled(),
      isWarnEnabled: () => getRealLogger().isWarnEnabled(),
      isErrorEnabled: () => getRealLogger().isErrorEnabled(),
    };
  }

  /**
   * Create new logger instance
   */
  private static createLogger(name: string): LoggerProvider {
    if (this.config.defaultImplementation) {
      return this.config.defaultImplementation(name);
    }

    // Default: ConsoleLogger
    return new ConsoleLogger(name, {
      level: this.config.defaultLevel,
      ...this.config.consoleOptions,
    });
  }
}
