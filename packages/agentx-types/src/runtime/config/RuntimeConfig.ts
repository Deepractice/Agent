/**
 * RuntimeConfig - Configuration for Runtime/Driver
 *
 * Merged config from definition + instance scope.
 * Passed to Driver along with context and sandbox.
 */

/**
 * RuntimeConfig - Driver configuration
 *
 * Simple key-value config, schema defined by Runtime.
 */
export type RuntimeConfig = Record<string, unknown>;
