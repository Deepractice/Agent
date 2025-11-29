/**
 * LoggerFactory - Central factory for creating logger instances
 */

import type { Logger, LoggerFactory as LoggerFactoryInterface } from "@deepractice-ai/agentx-types";
import { LogLevel } from "@deepractice-ai/agentx-types";
import { ConsoleLogger, type ConsoleLoggerOptions } from "./ConsoleLogger";

let externalFactory: LoggerFactoryInterface | null = null;

export interface LoggerFactoryConfig {
  defaultImplementation?: (name: string) => Logger;
  defaultLevel?: LogLevel;
  consoleOptions?: Omit<ConsoleLoggerOptions, "level">;
}

export class LoggerFactory {
  private static loggers: Map<string, Logger> = new Map();
  private static config: LoggerFactoryConfig = {
    defaultLevel: LogLevel.INFO,
  };

  static getLogger(nameOrClass: string | Function): Logger {
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
    this.config = { defaultLevel: LogLevel.INFO };
    externalFactory = null;
  }

  private static createLazyLogger(name: string): Logger {
    let realLogger: Logger | null = null;

    const getRealLogger = (): Logger => {
      if (!realLogger) {
        realLogger = this.createLogger(name);
      }
      return realLogger;
    };

    return {
      name,
      level: this.config.defaultLevel || LogLevel.INFO,
      debug: (message: string, context?: any) => getRealLogger().debug(message, context),
      info: (message: string, context?: any) => getRealLogger().info(message, context),
      warn: (message: string, context?: any) => getRealLogger().warn(message, context),
      error: (message: string | Error, context?: any) => getRealLogger().error(message, context),
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
 * Set external LoggerFactory (called by agentx.provide)
 */
export function setLoggerFactory(factory: LoggerFactoryInterface): void {
  externalFactory = factory;
  LoggerFactory.reset();
  externalFactory = factory;
}

/**
 * Create a logger instance
 */
export function createLogger(name: string): Logger {
  return LoggerFactory.getLogger(name);
}
