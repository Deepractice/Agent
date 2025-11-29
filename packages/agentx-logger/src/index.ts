/**
 * @deepractice-ai/agentx-logger
 *
 * SLF4J-style logging facade for AgentX.
 *
 * @example
 * ```typescript
 * import { createLogger } from "@deepractice-ai/agentx-logger";
 *
 * const logger = createLogger("MyModule");
 * logger.info("Hello");
 * logger.debug("Debug info", { context: "data" });
 * ```
 */

// Re-export types from agentx-types
export { LogLevel } from "@deepractice-ai/agentx-types";
export type {
  Logger,
  LogContext,
  LoggerFactory as LoggerFactoryInterface,
} from "@deepractice-ai/agentx-types";

// Core exports
export { ConsoleLogger, type ConsoleLoggerOptions } from "./ConsoleLogger";
export {
  LoggerFactory,
  type LoggerFactoryConfig,
  setLoggerFactory,
  createLogger,
} from "./LoggerFactory";
