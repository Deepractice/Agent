Feature: Agent Messaging
  As a developer
  I want to send messages to the agent and receive responses
  So that I can build conversational AI applications

  Background:
    Given I have created an agent with valid configuration

  Scenario: Send a simple text message
    When I send the message "Hello, how are you?"
    Then the agent should emit a "user" event with my message
    And the agent should emit an "assistant" event with a response
    And the agent should emit a "result" event when complete

  Scenario: Receive streaming responses
    Given I am listening for "stream_event" events
    When I send a message "Explain quantum computing"
    Then I should receive multiple stream events
    And each stream event should contain delta content
    And the deltas should arrive in order

  Scenario: Access conversation history
    Given I have sent 3 messages to the agent
    When I check the agent's messages property
    Then I should see all 6 messages (3 user + 3 assistant)
    And the messages should be in chronological order

  Scenario: Send message with context
    Given I have sent "My name is Alice"
    When I send "What's my name?"
    Then the assistant response should mention "Alice"

  Scenario: Track token usage
    Given I am listening for "result" events
    When I send a message and wait for completion
    Then the result event should include token usage
    And usage should show input and output tokens
    And usage should show cache read and write tokens

  Scenario: Track conversation cost
    Given I send a message and wait for completion
    When I receive the result event
    Then it should include totalCostUsd
    And the cost should be greater than 0

  Scenario: Multiple messages in sequence
    When I send "Hello"
    And I wait for completion
    And I send "How are you?"
    And I wait for completion
    Then the agent should have 4 messages total
    And each request should have its own result event
