/**
 * LoggerFactoryImpl - Central factory for creating logger instances
 *
 * Implements lazy initialization pattern:
 * - createLogger() can be called at module level (before config)
 * - Real logger is created on first use
 * - External LoggerFactory can be injected via Runtime
 */

import type { Logger, LoggerFactory, LogContext, LogLevel } from "@agentxjs/types";
import { ConsoleLogger, type ConsoleLoggerOptions } from "./ConsoleLogger";

// External factory injected via Runtime
let externalFactory: LoggerFactory | null = null;

// Version counter to invalidate cached real loggers
let factoryVersion = 0;

export interface LoggerFactoryConfig {
  defaultImplementation?: (name: string) => Logger;
  defaultLevel?: LogLevel;
  consoleOptions?: Omit<ConsoleLoggerOptions, "level">;
}

/**
 * Internal LoggerFactory implementation
 *
 * Uses lazy proxy pattern to allow module-level createLogger() calls.
 */
export class LoggerFactoryImpl {
  private static loggers: Map<string, Logger> = new Map();
  private static config: LoggerFactoryConfig = {
    defaultLevel: "info",
  };

  static getLogger(nameOrClass: string | (new (...args: unknown[]) => unknown)): Logger {
    const name = typeof nameOrClass === "string" ? nameOrClass : nameOrClass.name;

    if (this.loggers.has(name)) {
      return this.loggers.get(name)!;
    }

    const lazyLogger = this.createLazyLogger(name);
    this.loggers.set(name, lazyLogger);
    return lazyLogger;
  }

  static configure(config: LoggerFactoryConfig): void {
    this.config = { ...this.config, ...config };
  }

  static reset(): void {
    this.loggers.clear();
    this.config = { defaultLevel: "info" };
    externalFactory = null;
    factoryVersion++; // Invalidate all cached real loggers
  }

  private static createLazyLogger(name: string): Logger {
    let realLogger: Logger | null = null;
    let loggerVersion = -1; // Track which factory version created this logger

    const getRealLogger = (): Logger => {
      // Recreate logger if factory version changed (setLoggerFactory was called)
      if (!realLogger || loggerVersion !== factoryVersion) {
        realLogger = this.createLogger(name);
        loggerVersion = factoryVersion;
      }
      return realLogger;
    };

    return {
      name,
      level: this.config.defaultLevel || "info",
      debug: (message: string, context?: LogContext) => getRealLogger().debug(message, context),
      info: (message: string, context?: LogContext) => getRealLogger().info(message, context),
      warn: (message: string, context?: LogContext) => getRealLogger().warn(message, context),
      error: (message: string | Error, context?: LogContext) =>
        getRealLogger().error(message, context),
      isDebugEnabled: () => getRealLogger().isDebugEnabled(),
      isInfoEnabled: () => getRealLogger().isInfoEnabled(),
      isWarnEnabled: () => getRealLogger().isWarnEnabled(),
      isErrorEnabled: () => getRealLogger().isErrorEnabled(),
    };
  }

  private static createLogger(name: string): Logger {
    if (externalFactory) {
      return externalFactory.getLogger(name);
    }

    if (this.config.defaultImplementation) {
      return this.config.defaultImplementation(name);
    }

    return new ConsoleLogger(name, {
      level: this.config.defaultLevel,
      ...this.config.consoleOptions,
    });
  }
}

/**
 * Set external LoggerFactory (called by Runtime initialization)
 */
export function setLoggerFactory(factory: LoggerFactory): void {
  externalFactory = factory;
  LoggerFactoryImpl.reset();
  externalFactory = factory;
}

/**
 * Create a logger instance
 *
 * Safe to call at module level before Runtime is configured.
 * Uses lazy initialization - actual logger is created on first use.
 *
 * @param name - Logger name (hierarchical, e.g., "engine/AgentEngine")
 * @returns Logger instance (lazy proxy)
 */
export function createLogger(name: string): Logger {
  return LoggerFactoryImpl.getLogger(name);
}
