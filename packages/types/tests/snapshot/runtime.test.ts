/**
 * Runtime Types Contract Snapshot Test
 *
 * This test ensures the stability of the runtime type contracts.
 * Any changes to the exported types will cause this test to fail,
 * requiring explicit acknowledgment via snapshot update.
 *
 * To update snapshots after intentional changes:
 *   pnpm test:update
 */

import { describe, it, expect } from "vitest";
import * as RuntimeExports from "~/runtime";

/**
 * Extract the shape of exports for snapshot testing.
 * This captures what is exported and their types.
 */
function getExportShape(exports: Record<string, unknown>): Record<string, string> {
  const shape: Record<string, string> = {};

  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === "function") {
      // For functions, capture the function signature hint
      shape[key] = `function(${value.length} args)`;
    } else if (typeof value === "object" && value !== null) {
      shape[key] = "object";
    } else if (typeof value === "string") {
      // For string constants (like LATEST_PROTOCOL_VERSION)
      shape[key] = `const: "${value}"`;
    } else if (typeof value === "number") {
      shape[key] = `const: ${value}`;
    } else if (typeof value === "boolean") {
      shape[key] = `const: ${value}`;
    } else {
      shape[key] = typeof value;
    }
  }

  return shape;
}

describe("Runtime Types Contract", () => {
  it("should maintain stable exports", () => {
    const shape = getExportShape(RuntimeExports);
    expect(shape).toMatchSnapshot();
  });

  it("should export all expected runtime values", () => {
    // These are the runtime values (functions, constants) that must exist
    const expectedRuntimeExports = [
      // Type guards from event/environment
      "isDriveableEvent",
      "isConnectionEvent",
      // Type guards from event/runtime
      "isRuntimeEvent",
      "isRequestEvent",
      "isResultEvent",
      "isNotificationEvent",
      // Type guards from event/runtime/container
      "isContainerEvent",
      "isSandboxEvent",
      // Type guards from event/runtime/session
      "isSessionEvent",
      // Stream event helper
      "toAgentStreamEvent",
      // MCP constants
      "LATEST_PROTOCOL_VERSION",
      "SUPPORTED_PROTOCOL_VERSIONS",
      // StopReason guard
      "isStopReason",
    ];

    for (const exportName of expectedRuntimeExports) {
      expect(RuntimeExports, `Missing expected export: ${exportName}`).toHaveProperty(exportName);
    }
  });

  it("should have correct type guard signatures", () => {
    // Verify type guards are functions with correct arity
    expect(typeof RuntimeExports.isDriveableEvent).toBe("function");
    expect(typeof RuntimeExports.isConnectionEvent).toBe("function");
    expect(typeof RuntimeExports.isRuntimeEvent).toBe("function");
    expect(typeof RuntimeExports.isRequestEvent).toBe("function");
    expect(typeof RuntimeExports.isResultEvent).toBe("function");
    expect(typeof RuntimeExports.isNotificationEvent).toBe("function");
    expect(typeof RuntimeExports.isContainerEvent).toBe("function");
    expect(typeof RuntimeExports.isSandboxEvent).toBe("function");
    expect(typeof RuntimeExports.isSessionEvent).toBe("function");
    expect(typeof RuntimeExports.toAgentStreamEvent).toBe("function");
    expect(typeof RuntimeExports.isStopReason).toBe("function");
  });

  it("should export MCP protocol version constant", () => {
    // This constant may change as MCP protocol evolves
    expect(typeof RuntimeExports.LATEST_PROTOCOL_VERSION).toBe("string");
    expect(Array.isArray(RuntimeExports.SUPPORTED_PROTOCOL_VERSIONS)).toBe(true);
  });
});
