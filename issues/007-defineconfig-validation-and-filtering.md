# Issue 007: defineConfig Validation and Config Filtering

**Status**: Open
**Priority**: Medium
**Created**: 2025-01-19

## Problem

Currently, `defineConfig` only provides type checking and validation, but does NOT filter out undefined fields when passing config to drivers. This leads to two issues:

1. **No enforcement**: Fields can be passed to drivers even if they're not defined in `defineConfig`
2. **Inconsistent behavior**: Some fields work without being defined (e.g., `baseUrl`, `cwd` worked before), while others don't (e.g., `mcpServers` didn't work until added to schema)

## Current Behavior

```typescript
// ClaudeAgent.ts
export const ClaudeAgent = defineAgent({
  name: "Claude",
  driver: ClaudeSDKDriver,
  config: defineConfig({
    apiKey: { type: "string", required: true },
    model: { type: "string", default: "claude-3-5-sonnet-20241022" },
    // Only 2 fields defined!
  }),
});

// But in practice, this works:
const agent = ClaudeAgent.create({
  apiKey: "xxx",
  model: "yyy",
  baseUrl: "zzz",        // ⚠️ Not in schema, but passed through
  cwd: "/path",          // ⚠️ Not in schema, but passed through
  mcpServers: {...},     // ⚠️ Not in schema, but passed through
});
```

**Why it works**: `defineConfig.create()` validates defined fields but passes the entire config object to the driver, including undefined fields.

## Expected Behavior

After calling `defineConfig.create()`, **ONLY fields defined in the schema should be passed** to the driver.

```typescript
// Approach 1: Strict filtering
const validatedConfig = defineConfig.create(userConfig);
// validatedConfig should ONLY contain { apiKey, model }
// All other fields filtered out

// Approach 2: Explicit "passthrough" option
config: defineConfig(
  {
    apiKey: { type: "string", required: true },
    model: { type: "string" },
  },
  {
    strict: true, // Only allow defined fields
  }
);
```

## Root Cause

In `defineConfig.ts:288-302`, the `create()` function:

```typescript
create: (input: Partial<InferConfig<TSchema>>) => {
  // Apply defaults
  const config = applyDefaults(input, schema);

  // Validate
  const errors = validateConfig(config, schema);

  if (errors.length > 0) {
    throw new ConfigValidationError(...);
  }

  return config as InferConfig<TSchema>;  // ⚠️ Returns full input + defaults
}
```

The `applyDefaults()` function spreads the input: `{ ...config }`, keeping all fields.

## Proposed Solution

### Option 1: Add filtering step in `defineConfig.create()`

```typescript
function filterBySchema(config: any, schema: ConfigSchema): any {
  const result: any = {};

  for (const [key, fieldOrSchema] of Object.entries(schema)) {
    if (config[key] !== undefined) {
      if ("type" in fieldOrSchema) {
        // Field defined in schema
        result[key] = config[key];
      } else {
        // Nested schema
        result[key] = filterBySchema(config[key], fieldOrSchema as ConfigSchema);
      }
    }
  }

  return result;
}

create: (input: Partial<InferConfig<TSchema>>) => {
  const config = applyDefaults(input, schema);
  const errors = validateConfig(config, schema);

  if (errors.length > 0) {
    throw new ConfigValidationError(...);
  }

  // ✅ Filter to only include defined fields
  const filtered = filterBySchema(config, schema);
  return filtered as InferConfig<TSchema>;
}
```

### Option 2: Add strict mode option

```typescript
export function defineConfig<TSchema extends ConfigSchema>(
  schema: TSchema,
  options?: { strict?: boolean } // Default: false for backward compatibility
): DefinedConfig<TSchema>;
```

## Impact

**Breaking Change**: Yes, if we enforce strict filtering by default.

**Migration Path**:

1. Add all currently-used fields to `ClaudeAgent` schema (already done in latest code)
2. Update other agents to include all fields in their schemas
3. Enable strict filtering

## Action Items

- [ ] Implement `filterBySchema()` function
- [ ] Add filtering to `defineConfig.create()`
- [ ] Update all agent definitions to include complete schemas
- [ ] Add tests for config filtering
- [ ] Document the behavior in `defineConfig` JSDoc

## Related Files

- `packages/agentx-framework/src/defineConfig.ts` - Config definition system
- `packages/agentx-framework/src/defineAgent.ts` - Agent creation (line 176)
- `packages/agentx-framework/src/agents/ClaudeAgent.ts` - Example agent definition
- `apps/agentx-web/server/index.ts` - Config usage in production

## Notes

This issue was discovered when adding `mcpServers` support - it only worked after adding it to the schema, even though other fields (baseUrl, cwd) worked without being defined.
