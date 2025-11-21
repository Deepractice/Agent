/**
 * createLogger API
 *
 * Convenient API for creating logger instances.
 * More flexible than LoggerFactory.getLogger for non-class scenarios.
 *
 * @example
 * ```typescript
 * // Simple usage
 * const logger = createLogger("MyModule");
 *
 * // With options
 * const logger = createLogger({
 *   name: "MyModule",
 *   level: LogLevel.DEBUG
 * });
 *
 * // In utility functions
 * function myUtility() {
 *   const logger = createLogger("utils/myUtility");
 *   logger.info("Utility called");
 * }
 * ```
 */

import { LoggerFactory } from "~/core";
import type { LoggerProvider } from "~/types";
import { LogLevel } from "~/types";

/**
 * Logger creation options
 */
export interface CreateLoggerOptions {
  /**
   * Logger name
   */
  name: string;

  /**
   * Custom log level (overrides factory default)
   * Note: Currently not supported, will be added in future version
   */
  level?: LogLevel;
}

/**
 * Create a logger instance
 *
 * This is a convenience API over LoggerFactory.getLogger that's more
 * suitable for functional programming and utility modules.
 *
 * @param nameOrOptions - Logger name string or options object
 * @returns LoggerProvider instance
 *
 * @example
 * ```typescript
 * // Simple string name
 * const logger = createLogger("MyModule");
 * logger.info("Module started");
 *
 * // With options
 * const logger = createLogger({
 *   name: "MyModule",
 *   level: LogLevel.DEBUG
 * });
 *
 * // In utility functions
 * function processData() {
 *   const logger = createLogger("utils/processData");
 *   logger.debug("Processing...");
 * }
 *
 * // In facade functions
 * export function createAgent() {
 *   const logger = createLogger("facade/createAgent");
 *   logger.info("Creating agent");
 * }
 * ```
 */
export function createLogger(nameOrOptions: string | CreateLoggerOptions): LoggerProvider {
  const name = typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;

  // For now, just delegate to LoggerFactory
  // In the future, we can support per-logger level configuration
  const logger = LoggerFactory.getLogger(name);

  // TODO: Support custom level per logger
  // if (typeof nameOrOptions === "object" && nameOrOptions.level !== undefined) {
  //   // Set custom level for this logger
  // }

  return logger;
}
