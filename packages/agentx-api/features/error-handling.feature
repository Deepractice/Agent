Feature: Error Handling
  As a developer
  I want to handle errors gracefully
  So that my application can recover from failures

  Scenario: Handle configuration errors
    When I try to create an agent with invalid configuration
    Then it should throw an AgentConfigError
    And the error should tell me which field is invalid
    And the error should suggest how to fix it

  Scenario: Catch abort errors
    Given I have an agent processing a request
    When I call agent.clear() during processing
    Then subsequent operations should handle the abortion gracefully
    And no partial results should be emitted

  Scenario: Handle network failures
    Given the API is unreachable
    When I send a message
    Then I should receive an error result event
    And the error should indicate the network failure
    And I can retry the operation

  Scenario: Handle API errors
    Given the API returns an error response
    When I send a message
    Then I should receive a result event with error subtype
    And the error should include the API error message

  Scenario: Handle max turns error
    Given the agent has reached maximum conversation turns
    When I send another message
    Then I should receive a result event with subtype "error_max_turns"
    And I can decide to start a new conversation

  Scenario: Handle execution errors
    Given the agent encounters an error during tool execution
    When processing the request
    Then I should receive a result event with subtype "error_during_execution"
    And the error details should be included
    And the conversation state should remain consistent

  Scenario: Distinguish error types
    Given I receive an error
    When I check the error name property
    Then I can determine if it's AgentConfigError or AgentAbortError
    And I can handle each type appropriately

  Scenario: Error includes stack trace
    Given any error is thrown
    Then it should include a stack trace
    And I can use it for debugging

  Scenario: Errors don't leak sensitive information
    Given I provide invalid API key
    When the error is thrown
    Then it should not expose the full API key in the message
    And it should be safe to log

  Scenario: Graceful degradation on partial failures
    Given one MCP server fails to connect
    When the agent initializes
    Then it should still work with other MCP servers
    And I should be notified of the failure
