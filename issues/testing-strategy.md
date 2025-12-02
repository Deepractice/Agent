# Testing Strategy

> Convention over configuration. Test behavior, not implementation.

## Philosophy

**Core Principle**: Write tests from user perspective (BDD), validate edge cases with unit tests.

- **BDD (Behavior-Driven Development)**: User-facing behavior and integration
- **Unit Tests**: Critical logic, algorithms, and boundary conditions

## Test Distribution

```
┌─────────────────────────────────────────┐
│  BDD (Primary)                          │
│  • API method contracts                 │
│  • Service HTTP interactions            │
│  • User workflows                       │
│  • Integration scenarios                │
└─────────────────────────────────────────┘
              ↓ delegates to
┌─────────────────────────────────────────┐
│  Unit Tests (Supplementary)             │
│  • Algorithm correctness                │
│  • Edge cases & boundaries              │
│  • Error handling paths                 │
│  • Complex logic validation             │
└─────────────────────────────────────────┘
```

This 80/20 split ensures we test what matters while keeping maintenance low.

---

## BDD Testing with Cucumber

We use `@deepracticex/vitest-cucumber` for authentic Cucumber experience on Vitest.

### When to Write BDD Tests

✅ **Always write BDD for**:

- Public API methods (library exports)
- HTTP endpoints (service routes)
- User workflows (multi-step scenarios)
- Feature behaviors (as per requirements)

❌ **Don't write BDD for**:

- Internal utilities (unless critical)
- Pure functions (use unit tests)
- Implementation details

### Directory Structure

```
packages/[name]/
├── features/                    # BDD features
│   ├── api/                     # API behavior tests
│   │   └── user-management.feature
│   └── integration/             # Integration scenarios
│       └── auth-flow.feature
└── tests/
    ├── support/                 # Loaded FIRST
    │   ├── hooks.ts             # Before/After hooks
    │   └── world.ts             # Custom test context
    └── steps/                   # Loaded SECOND
        ├── api.steps.ts         # Step definitions for API
        └── common.steps.ts      # Shared steps

apps/[name]/
├── features/                    # Service features
│   ├── http/                    # HTTP endpoint tests
│   │   └── user-api.feature
│   └── workflows/               # User workflows
│       └── signup-flow.feature
└── tests/
    ├── support/
    │   ├── hooks.ts
    │   └── world.ts
    └── steps/
        ├── http.steps.ts
        └── workflow.steps.ts
```

### Feature File Structure

**Library API Example**:

```gherkin
# packages/logger/features/api/logging.feature
Feature: Logger API
  As a developer
  I want to log messages with different levels
  So that I can debug and monitor my application

  Background:
    Given a logger instance is created

  Scenario: Log info message
    When I log an info message "Server started"
    Then the log output should contain "INFO"
    And the log output should contain "Server started"

  Scenario: Log with context
    When I log an error "Database connection failed" with context:
      | key      | value           |
      | host     | localhost:5432  |
      | retries  | 3               |
    Then the log should include the context data
```

**Service HTTP Example**:

```gherkin
# apps/agent-service/features/http/users.feature
Feature: User Management API
  As a client application
  I want to manage users via HTTP API
  So that I can create and retrieve user data

  Background:
    Given the service is running on port 5201
    And the database is empty

  Scenario: Create a new user
    When I POST to "/api/users" with:
      """json
      {
        "name": "Alice",
        "email": "alice@test.com"
      }
      """
    Then the response status should be 201
    And the response body should have:
      | field | value          |
      | name  | Alice          |
      | email | alice@test.com |
    And a user "Alice" should exist in database

  Scenario: Get user by ID
    Given a user exists with name "Bob"
    When I GET "/api/users/{userId}"
    Then the response status should be 200
    And the response should contain user "Bob"
```

### Step Definitions

**API Steps** (`tests/steps/api.steps.ts`):

```typescript
import { Given, When, Then, DataTable } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";

Given("a logger instance is created", function () {
  this.logger = createLogger({ level: "debug" });
});

When("I log an info message {string}", function (message: string) {
  this.logger.info(message);
});

Then("the log output should contain {string}", function (expected: string) {
  expect(this.logOutput).toContain(expected);
});
```

**HTTP Steps** (`tests/steps/http.steps.ts`):

```typescript
import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";

Given("the service is running on port {int}", async function (port: number) {
  this.baseUrl = `http://localhost:${port}`;
  await this.waitForService();
});

When("I POST to {string} with:", async function (path: string, body: string) {
  this.response = await fetch(`${this.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  this.responseBody = await this.response.json();
});

Then("the response status should be {int}", function (status: number) {
  expect(this.response.status).toBe(status);
});
```

### Custom World Context

Define shared test context in `tests/support/world.ts`:

```typescript
import { setWorldConstructor } from "@deepracticex/vitest-cucumber";

interface TestWorld {
  // Common
  logger?: Logger;
  logOutput: string[];

  // HTTP
  baseUrl?: string;
  response?: Response;
  responseBody?: any;

  // Database
  db?: Database;

  // Helpers
  waitForService(): Promise<void>;
  cleanDatabase(): Promise<void>;
}

setWorldConstructor(function (): TestWorld {
  return {
    logOutput: [],

    async waitForService() {
      // Retry logic
    },

    async cleanDatabase() {
      await this.db?.clear();
    },
  };
});
```

### Hooks

Setup and teardown in `tests/support/hooks.ts`:

```typescript
import { Before, After, BeforeAll, AfterAll } from "@deepracticex/vitest-cucumber";

BeforeAll(async function () {
  // Start services, connect to test DB
  this.testServer = await startTestServer();
});

Before(async function () {
  // Clean state before each scenario
  await this.cleanDatabase();
  this.logOutput = [];
});

After(async function () {
  // Cleanup after scenario
  // Capture screenshots on failure, etc.
});

AfterAll(async function () {
  // Shutdown services
  await this.testServer?.stop();
});
```

### Configuration

**Package-level** (`packages/logger/vitest.config.ts`):

```typescript
import { defineConfig } from "vitest/config";
import { vitestCucumber } from "@deepracticex/vitest-cucumber/plugin";

export default defineConfig({
  plugins: [
    vitestCucumber({
      features: ["features/**/*.feature"],
      steps: "tests/steps",
    }),
  ],
  test: {
    include: ["**/*.feature", "**/*.test.ts"],
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts"],
    },
  },
});
```

**Service-level** (`apps/agent-service/vitest.config.ts`):

```typescript
import { defineConfig } from "vitest/config";
import { vitestCucumber } from "@deepracticex/vitest-cucumber/plugin";

export default defineConfig({
  plugins: [
    vitestCucumber({
      features: ["features/**/*.feature"],
      steps: "tests/steps",
    }),
  ],
  test: {
    include: ["**/*.feature", "**/*.test.ts"],
    testTimeout: 10000, // Longer for HTTP tests
    hookTimeout: 5000,
  },
});
```

---

## Unit Testing

Use Vitest's standard test API for unit tests.

### When to Write Unit Tests

✅ **Write unit tests for**:

- Algorithm implementations (sorting, parsing, calculation)
- Edge cases and boundary conditions
- Error handling branches
- Complex business logic
- Data transformations

❌ **Don't write unit tests for**:

- Simple getters/setters
- Pass-through functions
- Integration points (use BDD instead)

### Directory Structure

```
packages/[name]/
├── src/
│   ├── core/
│   │   ├── parser.ts
│   │   └── parser.test.ts       # Co-located with implementation
│   └── utils/
│       ├── validator.ts
│       └── validator.test.ts
```

Co-locate unit tests with source files for:

- Easy discovery
- Clear ownership
- Refactoring safety

### Unit Test Example

**Algorithm Test**:

```typescript
// packages/config/src/core/parser.test.ts
import { describe, it, expect } from "vitest";
import { parseEnvValue } from "./parser";

describe("parseEnvValue", () => {
  it("should parse boolean strings", () => {
    expect(parseEnvValue("true")).toBe(true);
    expect(parseEnvValue("false")).toBe(false);
    expect(parseEnvValue("TRUE")).toBe(true);
  });

  it("should parse integer strings", () => {
    expect(parseEnvValue("42")).toBe(42);
    expect(parseEnvValue("-10")).toBe(-10);
    expect(parseEnvValue("0")).toBe(0);
  });

  it("should handle edge cases", () => {
    expect(parseEnvValue("")).toBe("");
    expect(parseEnvValue("  spaces  ")).toBe("spaces");
  });

  it("should throw on invalid number format", () => {
    expect(() => parseEnvValue("123abc")).toThrow("Invalid number");
  });
});
```

**Error Handling Test**:

```typescript
// packages/logger/src/core/formatter.test.ts
import { describe, it, expect } from "vitest";
import { formatLogMessage } from "./formatter";

describe("formatLogMessage", () => {
  it("should handle circular references", () => {
    const obj: any = { name: "test" };
    obj.self = obj;

    expect(() => formatLogMessage(obj)).not.toThrow();
    expect(formatLogMessage(obj)).toContain("[Circular]");
  });

  it("should truncate long strings", () => {
    const longString = "x".repeat(10000);
    const result = formatLogMessage({ data: longString });

    expect(result.length).toBeLessThan(5000);
    expect(result).toContain("...");
  });
});
```

---

## Test Coverage Guidelines

### Coverage Targets

```
Overall:     70-80% (quality over quantity)
BDD:         60-70% (focus on happy paths + critical failures)
Unit Tests:  80-90% (thorough edge case coverage)
```

### What to Prioritize

**High Priority** (must have tests):

- Public APIs
- Critical business logic
- Security-sensitive code
- Data validation and sanitization
- Error handling paths

**Medium Priority** (should have tests):

- Configuration parsing
- Data transformations
- Utility functions
- Integration points

**Low Priority** (optional):

- Type definitions
- Constants
- Simple adapters
- Trivial getters/setters

---

## Running Tests

### Development Workflow

```bash
# Watch mode (recommended during development)
pnpm test:watch

# Run all tests
pnpm test

# Run specific test file
pnpm vitest run packages/logger/features/api/logging.feature

# Coverage report
pnpm test:coverage
```

### CI/CD Integration

Tests run automatically on:

- Every push to feature branches
- Pull request creation
- Before deployment

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test:ci

- name: Check coverage
  run: pnpm test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

---

## Writing Good Tests

### BDD Best Practices

✅ **DO**:

- Write from user perspective
- Use domain language, not technical jargon
- Focus on behavior, not implementation
- Keep scenarios independent
- Use Background for common setup
- Reuse step definitions

❌ **DON'T**:

- Test implementation details
- Write overly complex scenarios
- Couple tests to specific data
- Use vague or ambiguous language
- Mix multiple concerns in one scenario

### Unit Test Best Practices

✅ **DO**:

- Test one thing per test
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases and boundaries
- Make tests deterministic

❌ **DON'T**:

- Test private methods directly
- Use random data without reason
- Make tests depend on each other
- Mock everything
- Write brittle assertions

### Test Naming

**BDD Scenarios**: Natural language

```gherkin
Scenario: User logs in with valid credentials
Scenario: API returns 404 when user not found
```

**Unit Tests**: Should-when pattern

```typescript
it("should return null when input is empty");
it("should throw error when value exceeds limit");
it("should parse nested objects correctly");
```

---

## Tools and Libraries

### Core Testing Stack

- **Vitest**: Fast unit test framework
- **@deepracticex/vitest-cucumber**: BDD/Cucumber integration
- **@cucumber/gherkin**: Feature file parsing

### Assertion and Mocking

```typescript
import { expect, vi } from "vitest";

// Built-in assertions
expect(value).toBe(42);
expect(array).toHaveLength(3);
expect(fn).toHaveBeenCalledWith("arg");

// Mocking
const mockFn = vi.fn();
vi.spyOn(obj, "method").mockReturnValue("mocked");
```

### HTTP Testing

```typescript
// Use native fetch or test client
const response = await fetch("http://localhost:5201/api/users");

// Or use supertest-like wrapper
import { request } from "./test-utils";
const res = await request(app).post("/api/users").send({ name: "Alice" });
```

---

## Migration Strategy

### Adding Tests to Existing Code

1. **Start with BDD**: Write feature file for user-facing behavior
2. **Add unit tests**: For critical logic uncovered by BDD
3. **Refactor if needed**: Extract testable units from complex functions
4. **Iterate**: Don't aim for 100% coverage immediately

### Legacy Code Testing

```
Priority 1: Bug fixes (add test first)
Priority 2: New features (BDD required)
Priority 3: Refactored code (add tests during refactor)
Priority 4: Stable old code (test only if touched)
```

---

## FAQ

### Q: BDD vs Unit Tests - which first?

**A**: Start with BDD. It defines the contract. Unit tests fill gaps.

### Q: How much mocking in BDD?

**A**: Minimal. BDD tests integration. Mock only external services (databases, APIs) in test environment setup.

### Q: Should I test private methods?

**A**: No. Test through public API. If private method needs testing, it might need to be a separate module.

### Q: Test coverage too low?

**A**: Check if you're testing the right things. 70% coverage of critical paths beats 90% coverage of everything.

### Q: Tests too slow?

**A**:

- Use test database (not production)
- Parallel execution (Vitest default)
- Mock external APIs
- Optimize setup/teardown

---

## Summary

**Testing Philosophy**:

- BDD for behavior (API, HTTP, workflows)
- Unit tests for edge cases (algorithms, validation)
- Convention over configuration
- Quality over quantity

**Key Takeaways**:

- 80% BDD (user perspective) + 20% Unit (developer perspective)
- Co-locate unit tests with source
- Organize BDD features by domain
- Reuse steps and world context
- Test behavior, not implementation
