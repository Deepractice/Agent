/**
 * LoggerFactory - Standard logger factory interface
 *
 * Factory for creating Logger instances. External implementations
 * can provide their own LoggerFactory to integrate custom logging
 * libraries (pino, winston, etc.)
 *
 * Similar to SLF4J's LoggerFactory in Java.
 *
 * @example
 * ```typescript
 * // Custom pino-based factory
 * const pinoFactory: LoggerFactory = {
 *   getLogger(name: string): Logger {
 *     return new PinoLogger(name);
 *   }
 * };
 *
 * // Inject into AgentX
 * agentx.provide(LoggerFactoryKey, pinoFactory);
 * ```
 */

import type { Logger } from "./Logger";

/**
 * LoggerFactory interface
 *
 * Factory for creating named Logger instances.
 */
export interface LoggerFactory {
  /**
   * Get or create a logger with the specified name
   *
   * @param name - Logger name (typically class name or module path)
   * @returns Logger instance
   */
  getLogger(name: string): Logger;
}
