/**
 * WebSocketLogger
 *
 * Sends frontend logs to backend via WebSocket for file persistence.
 * Also outputs to browser console.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export type LogContext = Record<string, unknown>;

export interface LoggerProvider {
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

/**
 * WebSocketLogger - Sends logs to backend
 */
export class WebSocketLogger implements LoggerProvider {
  readonly name: string;
  readonly level: LogLevel;
  private ws: WebSocket | null = null;
  private messageQueue: string[] = [];
  private isConnected = false;

  constructor(
    name: string,
    private wsUrl: string,
    level: LogLevel = LogLevel.DEBUG
  ) {
    this.name = name;
    this.level = level;
    this.connect();
  }

  private connect(): void {
    // Only connect in development environment
    const isDev = import.meta.env?.DEV || process.env?.NODE_ENV === 'development';
    if (!isDev) {
      return; // Skip WebSocket connection in production
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log(`[WebSocketLogger] Connected to ${this.wsUrl}`);

        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(message);
          }
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log("[WebSocketLogger] Disconnected from log collector");

        // Attempt reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = (error) => {
        console.error("[WebSocketLogger] WebSocket error:", error);
      };
    } catch (error) {
      console.error("[WebSocketLogger] Failed to connect:", error);
    }
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

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();

    // Console output (browser DevTools)
    const consoleMethod =
      level === "ERROR"
        ? console.error
        : level === "WARN"
        ? console.warn
        : level === "DEBUG"
        ? console.debug
        : console.log;

    const logLine = `${timestamp} ${level.padEnd(5)} [${this.name}] ${message}`;
    if (context && Object.keys(context).length > 0) {
      consoleMethod(logLine, context);
    } else {
      consoleMethod(logLine);
    }

    // Send to backend via WebSocket
    const logEntry = JSON.stringify({
      timestamp,
      level,
      name: this.name,
      message,
      context,
    });

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(logEntry);
    } else {
      // Queue message if not connected
      this.messageQueue.push(logEntry);

      // Limit queue size to prevent memory issues
      if (this.messageQueue.length > 1000) {
        this.messageQueue.shift();
      }
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * LoggerFactory for frontend
 */
class LoggerFactory {
  private static loggers: Map<string, LoggerProvider> = new Map();
  private static wsUrl = "ws://localhost:5201";
  private static defaultLevel = LogLevel.DEBUG;

  static configure(config: { wsUrl?: string; defaultLevel?: LogLevel }) {
    if (config.wsUrl) this.wsUrl = config.wsUrl;
    if (config.defaultLevel !== undefined) this.defaultLevel = config.defaultLevel;
  }

  static getLogger(name: string): LoggerProvider {
    if (!this.loggers.has(name)) {
      const logger = new WebSocketLogger(name, this.wsUrl, this.defaultLevel);
      this.loggers.set(name, logger);
    }
    return this.loggers.get(name)!;
  }
}

export { LoggerFactory };
