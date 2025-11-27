Feature: Error Manager
  As a developer
  I want to handle agent errors at platform level
  So that I can centralize error handling across all agents

  Background:
    Given a local AgentX instance

  # ===== Add Handler =====

  Scenario: Add error handler
    When I add an error handler to agentx.errors
    Then the handler should be registered

  Scenario: Error handler receives agent errors
    Given an error handler is registered
    And a created agent
    When the agent emits an error event
    Then the error handler should be called
    And the handler should receive agentId and error

  Scenario: Multiple handlers all receive errors
    Given 3 error handlers are registered
    And a created agent
    When the agent emits an error event
    Then all 3 handlers should be called

  # ===== Remove Handler =====

  Scenario: Remove error handler
    Given an error handler is registered
    When I remove the error handler
    And an agent emits an error event
    Then the removed handler should NOT be called

  # ===== Error Context =====

  Scenario: Error handler receives error event context
    Given an error handler is registered
    And a created agent
    When the agent emits an error with context:
      | field    | value           |
      | message  | Connection lost |
      | severity | error           |
    Then the handler should receive the error context

  # ===== Local Only =====

  Scenario: Remote mode does not have errors manager
    Given a remote AgentX instance
    Then agentx.errors should be undefined
