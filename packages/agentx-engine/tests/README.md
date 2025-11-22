# AgentX Core BDD Tests

Behavior-Driven Development (BDD) tests for agentx-core using Vitest + Cucumber.

## Overview

This test suite validates the core functionality of AgentX through feature files written in Gherkin syntax. Tests cover:

- **Agent Lifecycle** - Initialization, sending messages, cleanup
- **Event Layers** - 4-layer event system (Stream, State, Message, Exchange)
- **Message Sending** - User messages, assistant responses, streaming
- **Reactor Pattern** - Custom reactors, lifecycle management
- **Error Handling** - Error propagation, recovery, validation

## Architecture

```
tests/
├── setup.ts                    # Test configuration
├── steps/
│   ├── test-context.ts         # Shared test state
│   ├── agent-lifecycle.steps.ts
│   ├── event-layers.steps.ts
│   ├── message-sending.steps.ts
│   ├── reactor-pattern.steps.ts (TODO)
│   └── error-handling.steps.ts (TODO)
└── README.md
```

Feature files are in `features/` directory and are copied to `dist/features/` during build.

## Running Tests

### Install Dependencies

```bash
cd packages/agentx-core
pnpm install
```

### Run All Tests

```bash
pnpm test
```

This will:

1. Build the package (`tsup`)
2. Copy feature files to `dist/features/`
3. Run Vitest with Cucumber plugin

### Watch Mode

```bash
pnpm test:watch
```

Watches for changes and re-runs tests automatically.

### UI Mode

```bash
pnpm test:ui
```

Opens Vitest UI in browser for interactive test exploration.

### Run Specific Feature

```bash
pnpm test -- agent-lifecycle.feature
```

## Test Structure

### Feature Files (Gherkin)

Located in `features/` directory. Example:

```gherkin
Feature: Agent Lifecycle Management
  As a developer
  I want to manage agent lifecycle
  So that I can properly create and clean up agents

  Scenario: Successful agent initialization
    Given I create an agent service with the mock driver
    When I initialize the agent
    Then the agent should be in "ready" state
    And the agent should emit "agent_ready" state event
```

### Step Definitions (TypeScript)

Located in `tests/steps/`. Example:

```typescript
Given("I create an agent service with the mock driver", () => {
  ctx.agent = createAgent(ctx.driver, ctx.logger);
});

When("I initialize the agent", async () => {
  await ctx.agent!.initialize();
});

Then("the agent should be in {string} state", (state: string) => {
  expect(ctx.initialized).toBe(true);
});
```

## Test Context

The `TestContext` class maintains state across Given/When/Then steps:

```typescript
class TestContext {
  agent?: AgentService; // Agent instance
  driver?: any; // Mock driver
  logger?: AgentLogger; // Logger
  events: { [type: string]: AgentEvent[] }; // Event collectors
  errors: Error[]; // Error tracking
  testData: Record<string, any>; // Arbitrary test data
}
```

**Lifecycle:**

- `Before()` - Reset context before each scenario
- `After()` - Cleanup agent and subscriptions after each scenario

## Mock Components

### MockDriver

Simple driver that echoes user messages with character-by-character streaming:

```typescript
const driver = new MockDriver("session-id", "agent-id");

// Automatically responds with: "You said: [user message]"
```

Located at `src/driver/MockDriver.ts`.

### MockLogger

Captures log messages for verification:

```typescript
class MockLogger implements AgentLogger {
  logs: Array<{ level: LogLevel; message: string }> = [];
  // ... implements all logger methods
}
```

### MockCustomReactor

Tracks reactor lifecycle for testing:

```typescript
class MockCustomReactor implements Reactor {
  initializeCalled = false;
  destroyCalled = false;
  context?: ReactorContext;
}
```

## Event Subscription Pattern

Tests subscribe to events to verify behavior:

```typescript
// Subscribe to specific event type
ctx.subscribeToEvent("assistant_message");

// Send message
await agent.send("Hello");

// Verify events received
const events = ctx.getEvents("assistant_message");
expect(events.length).toBeGreaterThan(0);
```

## Writing New Tests

### 1. Create Feature File

Create `features/my-feature.feature`:

```gherkin
Feature: My New Feature
  Scenario: Test something
    Given some precondition
    When some action happens
    Then verify the result
```

### 2. Create Step Definitions

Create `tests/steps/my-feature.steps.ts`:

```typescript
import { Given, When, Then, Before, After } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { TestContext } from "./test-context";

const ctx = new TestContext();

Before(() => ctx.reset());
After(async () => {
  if (ctx.agent) await ctx.agent.destroy();
  ctx.cleanup();
});

Given("some precondition", () => {
  // Setup
});

When("some action happens", async () => {
  // Execute
});

Then("verify the result", () => {
  // Assert
  expect(ctx.testData.result).toBe(expected);
});
```

### 3. Run Tests

```bash
pnpm test -- my-feature.feature
```

## Best Practices

### 1. Use TestContext

Always store state in `ctx` instead of module-level variables:

```typescript
// ❌ Bad
let agent: AgentService;

// ✅ Good
ctx.agent = createAgent(...);
```

### 2. Subscribe to Events

Subscribe before triggering actions:

```typescript
// Subscribe first
ctx.subscribeToEvent("assistant_message");

// Then trigger
await ctx.agent!.send("Hello");

// Then verify
const events = ctx.getEvents("assistant_message");
```

### 3. Add Delays for Async Events

Events propagate asynchronously, add small delays:

```typescript
await ctx.agent!.send("Hello");
await new Promise((resolve) => setTimeout(resolve, 100));

const events = ctx.getEvents("assistant_message");
```

### 4. Clean Up Subscriptions

`After()` hooks clean up automatically:

```typescript
After(async () => {
  if (ctx.agent && !ctx.destroyed) {
    await ctx.agent.destroy();
  }
  ctx.cleanup(); // Unsubscribe all event listeners
});
```

### 5. Test One Thing Per Scenario

Keep scenarios focused:

```gherkin
# ✅ Good - focused scenario
Scenario: Send message stores in history
  Given I create and initialize an agent
  When I send message "Hello"
  Then the agent messages should contain the user message

# ❌ Bad - tests too many things
Scenario: Agent does everything
  Given I create an agent
  When I send 10 messages
  And I subscribe to 20 event types
  Then verify complex state
```

## Debugging Tests

### View Test Output

```bash
pnpm test -- --reporter=verbose
```

### Run Single Scenario

Add `@focus` tag:

```gherkin
@focus
Scenario: Debug this one
  Given ...
```

Then:

```bash
pnpm test
```

### Inspect Events

Add debug step:

```typescript
Then("debug events", () => {
  console.log(JSON.stringify(ctx.events, null, 2));
});
```

### Check Logs

MockLogger captures all logs:

```typescript
Then("verify logs", () => {
  const logger = ctx.logger as MockLogger;
  console.log(logger.logs);
});
```

## Test Reports

Test results are saved to `test-results/`:

- `test-results/index.html` - HTML report (open in browser)
- `test-results/results.json` - JSON results

## Coverage (TODO)

To add coverage:

```bash
pnpm test -- --coverage
```

Coverage reports will be in `coverage/` directory.

## CI Integration

Tests run in CI via:

```bash
pnpm turbo test
```

All tests must pass before merging PRs.

## Troubleshooting

### Tests timeout

Increase timeout in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 60000, // 60 seconds
}
```

### Feature file not found

Ensure `pnpm run copy:features` ran:

```bash
ls dist/features/
```

### Events not received

Add delay after triggering action:

```typescript
await ctx.agent!.send("Hello");
await new Promise((resolve) => setTimeout(resolve, 200));
```

### Import errors

Check TypeScript path aliases in `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    "~": path.resolve(__dirname, "./src"),
  },
}
```

## Future Improvements

- [ ] Complete `reactor-pattern.steps.ts`
- [ ] Complete `error-handling.steps.ts`
- [ ] Add performance benchmarks
- [ ] Add test coverage reporting
- [ ] Add visual regression tests for event sequences
- [ ] Test multi-turn conversations
- [ ] Test tool use scenarios (need enhanced MockDriver)
