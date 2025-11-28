/**
 * ProviderKey - Type-safe provider key for dependency injection
 *
 * Used with agentx.provide() and agentx.resolve() for
 * type-safe dependency injection.
 *
 * @example
 * ```typescript
 * // Provide implementation
 * agentx.provide(LoggerFactoryKey, myLoggerFactory);
 *
 * // Resolve (type-safe)
 * const factory = agentx.resolve(LoggerFactoryKey);
 * // ^? LoggerFactory | undefined
 * ```
 */

import type { LoggerFactory } from "../logger";

/**
 * ProviderKey interface
 *
 * A type-safe key for registering and resolving providers.
 * The generic type T represents the provider type.
 */
export interface ProviderKey<T> {
  /**
   * Unique symbol identifier
   */
  readonly id: symbol;

  /**
   * Human-readable name (for debugging)
   */
  readonly name: string;

  /**
   * Phantom property for type inference
   * @internal
   */
  readonly __type?: T;
}

/**
 * Create a provider key
 *
 * @param name - Human-readable name for the provider
 * @returns ProviderKey with the specified type
 *
 * @example
 * ```typescript
 * const MyServiceKey = createProviderKey<MyService>("MyService");
 * ```
 */
export function createProviderKey<T>(name: string): ProviderKey<T> {
  return {
    id: Symbol(name),
    name,
  };
}

// ============================================================================
// Built-in Provider Keys
// ============================================================================

/**
 * LoggerFactory provider key
 *
 * Use this key to provide a custom LoggerFactory implementation.
 *
 * @example
 * ```typescript
 * agentx.provide(LoggerFactoryKey, {
 *   getLogger(name) {
 *     return new PinoLogger(name);
 *   }
 * });
 * ```
 */
export const LoggerFactoryKey: ProviderKey<LoggerFactory> = {
  id: Symbol("LoggerFactory"),
  name: "LoggerFactory",
};
