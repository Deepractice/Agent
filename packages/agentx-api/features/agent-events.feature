Feature: Agent Event Handling
  As a developer
  I want to listen for agent events
  So that I can respond to different stages of the conversation

  Background:
    Given I have created an agent

  Scenario: Listen for assistant messages
    Given I register a handler for "assistant" events
    When the agent sends a response
    Then my handler should be called with the assistant message event

  Scenario: Listen for result events
    Given I register a handler for "result" events
    When the conversation completes
    Then my handler should be called with the result event
    And I can check if it was successful or had an error

  Scenario: Unregister event handlers
    Given I have registered a handler for "assistant" events
    When I unregister the handler
    And the agent sends a response
    Then my handler should NOT be called

  Scenario: Multiple handlers for same event
    Given I register handler A for "assistant" events
    And I register handler B for "assistant" events
    When the agent sends a response
    Then both handler A and B should be called

  Scenario: Event handlers receive typed data
    Given I register a handler for "result" events
    When the result event is emitted
    Then the handler parameter should have the correct type
    And I can access result-specific fields without type casting

  Scenario: Listen for system initialization
    Given I register a handler for "system" events with subtype "init"
    When the agent initializes
    Then I should receive the system init event
    And it should include model information
    And it should include available tools
    And it should include the current working directory

  Scenario: Stream events during response
    Given I register a handler for "stream_event" events
    When the agent is generating a response
    Then I should receive multiple stream events
    And I can display real-time progress to the user

  Scenario: Error result events
    Given I register a handler for "result" events
    When the agent encounters an error during execution
    Then the result event subtype should be an error type
    And it should include error details
    And it should still include usage statistics
