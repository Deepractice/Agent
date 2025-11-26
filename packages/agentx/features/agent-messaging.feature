Feature: Agent Messaging
  As a developer
  I want to send messages to agents
  So that I can interact with AI

  Background:
    Given a defined agent "ChatAgent" with echo driver
    And an agent instance is created

  # ===== Basic Messaging =====

  Scenario: Send string message to agent
    When I send message "Hello, Agent!"
    Then the agent should receive the message
    And the agent state should transition through "responding"
    And the agent state should return to "idle"

  Scenario: Send UserMessage object to agent
    When I send a UserMessage object with content "Hello from UserMessage"
    Then the agent should receive the message
    And the message should have the correct structure

  # ===== Event Stream =====

  Scenario: Agent produces stream events for message
    Given I subscribe to all events
    When I send message "Test message"
    Then I should receive "message_start" event
    And I should receive "text_delta" events
    And I should receive "message_stop" event

  Scenario: Agent produces assistant message
    Given I subscribe to all events
    When I send message "Echo this"
    Then I should receive "assistant_message" event
    And the assistant message should contain "Echo this"

  # ===== State Transitions =====

  Scenario: Agent state transitions during message processing
    Given I subscribe to all events
    When I send message "State test"
    Then the state should transition: idle -> responding -> idle

  # ===== Multiple Messages =====

  Scenario: Agent handles multiple sequential messages
    When I send message "First message"
    And I send message "Second message"
    Then both messages should be processed successfully
    And the agent state should be "idle"
