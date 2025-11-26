/**
 * Step definitions for config-schema.feature
 */

import { Given, When, Then, Before } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import {
  validateConfig,
  applyDefaults,
  processConfig,
  ConfigValidationError,
  type ConfigSchema,
  type InferConfig,
} from "~/index";

// ===== Test Context =====

let configSchema: ConfigSchema;
let validationResult: { valid: boolean; errors: string[] } | null = null;
let appliedConfig: Record<string, unknown> | null = null;
let processedConfig: Record<string, unknown> | null = null;
let caughtError: Error | null = null;

Before(() => {
  configSchema = {};
  validationResult = null;
  appliedConfig = null;
  processedConfig = null;
  caughtError = null;
});

// ===== Given Steps =====

Given("a config schema with:", (table: any) => {
  const rawTable = table.raw();
  const headers = rawTable[0];
  const rows = rawTable.slice(1);

  configSchema = {};

  for (const row of rows) {
    const field: Record<string, any> = {};
    let fieldName = "";

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = row[i];

      if (header === "field") {
        fieldName = value;
        continue;
      }
      if (header === "type") field.type = value;
      if (header === "required") field.required = value === "true";
      if (header === "default" && value) field.default = value;
    }

    if (fieldName) {
      configSchema[fieldName] = field;
    }
  }
});

// ===== When Steps: validateConfig =====

When("I validate config with name {string}", (name: string) => {
  validationResult = validateConfig(configSchema, { name });
});

When("I validate config with name as number {int}", (name: number) => {
  validationResult = validateConfig(configSchema, { name });
});

When("I validate config with port {int}", (port: number) => {
  validationResult = validateConfig(configSchema, { port });
});

When("I validate config with enabled true", () => {
  validationResult = validateConfig(configSchema, { enabled: true });
});

When("I validate config without apiKey", () => {
  validationResult = validateConfig(configSchema, {});
});

When("I validate config without name", () => {
  validationResult = validateConfig(configSchema, {});
});

When("I validate config without any fields", () => {
  validationResult = validateConfig(configSchema, {});
});

When("I validate config with:", (table: any) => {
  const rawTable = table.raw();
  const config: Record<string, any> = {};

  for (const [field, value] of rawTable) {
    // Parse values
    if (value === "true") config[field] = true;
    else if (value === "false") config[field] = false;
    else if (/^\d+$/.test(value)) config[field] = parseInt(value, 10);
    else config[field] = value;
  }

  validationResult = validateConfig(configSchema, config);
});

// ===== When Steps: applyDefaults =====

When("I apply defaults to config without model", () => {
  appliedConfig = applyDefaults(configSchema, {});
});

When("I apply defaults to config with model {string}", (model: string) => {
  appliedConfig = applyDefaults(configSchema, { model });
});

// ===== When Steps: processConfig =====

When("I process config with apiKey {string}", (apiKey: string) => {
  try {
    processedConfig = processConfig(configSchema, { apiKey });
  } catch (error) {
    caughtError = error as Error;
  }
});

When("I try to process config without apiKey", () => {
  try {
    processedConfig = processConfig(configSchema, {});
  } catch (error) {
    caughtError = error as Error;
  }
});

// ===== Then Steps: Validation =====

Then("validation should pass", () => {
  expect(validationResult).not.toBeNull();
  expect(validationResult!.valid).toBe(true);
});

Then("validation should fail", () => {
  expect(validationResult).not.toBeNull();
  expect(validationResult!.valid).toBe(false);
});

Then("no errors should be returned", () => {
  expect(validationResult).not.toBeNull();
  expect(validationResult!.errors.length).toBe(0);
});

Then("errors should contain {string}", (expectedError: string) => {
  expect(validationResult).not.toBeNull();
  const hasError = validationResult!.errors.some((e) => e.includes(expectedError));
  expect(hasError).toBe(true);
});

// ===== Then Steps: Defaults =====

Then("the result should have model {string}", (expectedModel: string) => {
  if (appliedConfig) {
    expect(appliedConfig.model).toBe(expectedModel);
  } else if (processedConfig) {
    expect(processedConfig.model).toBe(expectedModel);
  }
});

// ===== Then Steps: processConfig =====

Then("the result should have apiKey {string}", (expectedApiKey: string) => {
  expect(processedConfig).not.toBeNull();
  expect(processedConfig!.apiKey).toBe(expectedApiKey);
});

Then("it should throw ConfigValidationError", () => {
  expect(caughtError).not.toBeNull();
  expect(caughtError).toBeInstanceOf(ConfigValidationError);
});

Then("the error should contain {string}", (expectedMessage: string) => {
  expect(caughtError).not.toBeNull();
  expect(caughtError!.message).toContain(expectedMessage);
});
