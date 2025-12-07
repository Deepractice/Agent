/**
 * PinoLogger - Production-grade logger using pino
 *
 * Features:
 * - Fast JSON logging (pino is one of the fastest Node.js loggers)
 * - File logging with daily rotation
 * - Console output with pino-pretty in development
 * - Implements AgentX LoggerFactory interface
 */

import pino, { type Logger as PinoLogger } from "pino";
import fs from "node:fs";
import path from "node:path";
import type { Logger, LoggerFactory, LogContext, LogLevel } from "agentxjs";

/**
 * Map AgentX log levels to pino log levels
 */
const LEVEL_MAP: Record<LogLevel, string> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  silent: "silent",
};

/**
 * PinoLoggerAdapter - Adapts pino logger to AgentX Logger interface
 */
class PinoLoggerAdapter implements Logger {
  constructor(
    public readonly name: string,
    public readonly level: LogLevel,
    private readonly pino: PinoLogger
  ) {}

  debug(message: string, context?: LogContext): void {
    this.pino.debug(context || {}, message);
  }

  info(message: string, context?: LogContext): void {
    this.pino.info(context || {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.pino.warn(context || {}, message);
  }

  error(message: string | Error, context?: LogContext): void {
    if (message instanceof Error) {
      this.pino.error({ ...context, err: message }, message.message);
    } else {
      this.pino.error(context || {}, message);
    }
  }

  isDebugEnabled(): boolean {
    return this.pino.isLevelEnabled("debug");
  }

  isInfoEnabled(): boolean {
    return this.pino.isLevelEnabled("info");
  }

  isWarnEnabled(): boolean {
    return this.pino.isLevelEnabled("warn");
  }

  isErrorEnabled(): boolean {
    return this.pino.isLevelEnabled("error");
  }
}

/**
 * PinoLoggerFactory - Creates pino-based loggers
 *
 * Supports multiple output targets:
 * - Console (with pretty printing in dev)
 * - File (JSON format, daily rotation)
 */
export class PinoLoggerFactory implements LoggerFactory {
  private readonly rootLogger: PinoLogger;

  constructor(options: {
    level: LogLevel;
    logDir: string;
    pretty?: boolean; // Use pino-pretty for console output
  }) {
    const { level, logDir, pretty = process.env.NODE_ENV !== "production" } = options;

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create log file path with date
    const getLogFilePath = () => {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return path.join(logDir, `portagent-${dateStr}.log`);
    };

    // Create pino transports
    const targets: pino.TransportTargetOptions[] = [];

    // File transport (always JSON)
    targets.push({
      target: "pino/file",
      level: LEVEL_MAP[level],
      options: {
        destination: getLogFilePath(),
        mkdir: true,
      },
    });

    // Console transport
    if (pretty) {
      targets.push({
        target: "pino-pretty",
        level: LEVEL_MAP[level],
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      });
    } else {
      targets.push({
        target: "pino/file",
        level: LEVEL_MAP[level],
        options: { destination: 1 }, // stdout
      });
    }

    // Create root logger with multi-stream transport
    this.rootLogger = pino({
      level: LEVEL_MAP[level],
      transport: {
        targets,
      },
    });
  }

  getLogger(name: string): Logger {
    const childLogger = this.rootLogger.child({ name });
    return new PinoLoggerAdapter(name, this.rootLogger.level as LogLevel, childLogger);
  }
}
