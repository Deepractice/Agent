/**
 * AgentX Types Contract Snapshot Test
 *
 * This test ensures the stability of the AgentX API type contracts.
 * Any changes to the exported types will cause this test to fail,
 * requiring explicit acknowledgment via snapshot update.
 *
 * To update snapshots after intentional changes:
 *   pnpm test:update
 */

import { describe, it, expect } from "vitest";
import * as AgentXExports from "~/agentx";

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
      // For string constants
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

describe("AgentX Types Contract", () => {
  it("should maintain stable exports", () => {
    const shape = getExportShape(AgentXExports);
    expect(shape).toMatchSnapshot();
  });

  it("should export declared factory functions", () => {
    // These are declared functions (type-only at runtime)
    // The actual implementations are in the agentxjs package
    // Here we just verify the declarations are exported
    const expectedDeclaredFunctions = ["createAgentX", "defineAgent"];

    for (const exportName of expectedDeclaredFunctions) {
      expect(AgentXExports, `Missing expected export: ${exportName}`).toHaveProperty(exportName);
    }
  });
});
