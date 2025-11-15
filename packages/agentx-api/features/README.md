# AgentX API Features

Behavior-driven features describing how developers use the AgentX API.

## Purpose

These features describe **user-facing functionality** from the developer's perspective:
- How to create and configure agents
- How to send messages and receive responses
- How to handle events
- How to manage agent lifecycle
- How to handle errors

## Features

### 1. agent-messaging.feature
**Core functionality for sending messages and receiving responses**

- Send simple text messages
- Receive streaming responses
- Access conversation history
- Send messages with context
- Track token usage and costs
- Handle multiple sequential messages

### 2. agent-events.feature
**Event handling and listener management**

- Register and unregister event handlers
- Listen for different event types (user, assistant, stream, result, system)
- Handle multiple listeners for same event
- Receive typed event data
- Handle error events

### 3. agent-configuration.feature
**Agent initialization and configuration**

- Create agent with minimal config (apiKey, model)
- Configure system prompts
- Set thinking token limits
- Use custom API base URLs
- Configure MCP servers (stdio and SSE transports)
- Handle configuration validation errors

### 4. agent-lifecycle.feature
**Managing agent instances and resources**

- Agent and session ID management
- Clear conversation history
- Abort ongoing operations
- Destroy agents and cleanup resources
- Multiple independent agents
- Session persistence

### 5. error-handling.feature
**Graceful error handling**

- Configuration errors (AgentConfigError)
- Abort errors (AgentAbortError)
- Network failures
- API errors
- Max turns errors
- Execution errors
- Error type discrimination

## Running Tests

These features will be tested by implementation packages:

```bash
# In agentx-node (Node.js implementation)
cd packages/agentx-node
pnpm test  # Runs features against ClaudeProvider

# In agentx-browser (Browser implementation, future)
cd packages/agentx-browser
pnpm test  # Runs features against WebSocketProvider
```

## Architecture

```
User Code
  ↓ uses
agentx-api (this package)
  ├── Agent interface
  ├── AgentEvent types
  ├── AgentConfig types
  └── features/ ← You are here
       ↓ tested by
agentx-node
  └── ClaudeProvider (implements AgentProvider)
```

**What we describe here:**
- ✅ User-facing API behavior
- ✅ Event-driven interactions
- ✅ Configuration and lifecycle
- ✅ Error scenarios

**What we DON'T describe here:**
- ❌ Internal implementation details
- ❌ Provider-specific behavior
- ❌ Type definitions (those are in TypeScript)

## Feature Format

All features follow user story format:

```gherkin
Feature: [What the user wants to do]
  As a developer
  I want [capability]
  So that [benefit]

  Scenario: [Specific use case]
    Given [initial context]
    When [user action]
    Then [expected outcome]
```

**Focus**: What developers need to accomplish, not how it's implemented internally.

## Contributing

When adding new functionality:

1. Write the feature first (BDD style)
2. Implement the TypeScript types/interfaces
3. Implementation packages write step definitions
4. Tests validate the behavior

## Examples

### Good Feature (User-focused)
```gherkin
Scenario: Send a message and receive response
  When I send "Hello"
  Then I should receive an assistant response
```

### Bad Feature (Implementation-focused)
```gherkin
Scenario: Event has correct TypeScript type
  Then UserMessageEvent must have uuid field
  And uuid must be type string
```

The bad example focuses on types, not behavior. Types are validated by TypeScript itself.
