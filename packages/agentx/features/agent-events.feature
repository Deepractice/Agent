Feature: Agent Event Subscription
  As a developer
  I want to subscribe to agent events
  So that I can react to agent behavior

  Background:
    Given a defined agent "EventAgent" with echo driver
    And an agent instance is created

  # ===== Global Subscription =====

  Scenario: Subscribe to all events
    Given I subscribe with a global handler
    When I send message "Hello"
    Then the global handler should receive all events
    And the handler should receive stream events
    And the handler should receive message events

  # ===== Typed Subscription =====

  Scenario: Subscribe to single event type
    Given I subscribe to "text_delta" events
    When I send message "Hello"
    Then the handler should only receive "text_delta" events
    And the handler should not receive "message_start" events

  Scenario: Subscribe to multiple event types
    Given I subscribe to ["message_start", "message_stop"] events
    When I send message "Hello"
    Then the handler should receive "message_start" events
    And the handler should receive "message_stop" events
    And the handler should not receive "text_delta" events

  Scenario: Subscribe to assistant_message event
    Given I subscribe to "assistant_message" events
    When I send message "Echo me"
    Then the handler should receive exactly 1 event
    And the event should be "assistant_message"
    And the event data should contain "Echo me"

  # ===== Unsubscribe =====

  Scenario: Unsubscribe from events
    Given I subscribe to all events and get unsubscribe function
    When I call the unsubscribe function
    And I send message "Hello"
    Then the handler should not receive any events

  Scenario: Multiple subscriptions are independent
    Given I subscribe handler A to "text_delta" events
    And I subscribe handler B to "message_start" events
    When I unsubscribe handler A
    And I send message "Hello"
    Then handler A should not receive events
    And handler B should still receive events

  # ===== Error Handling =====

  Scenario: Handler error does not stop other handlers
    Given I subscribe a handler that throws error
    And I subscribe a normal handler
    When I send message "Hello"
    Then the normal handler should still receive events
    And the agent should not crash

  # ===== Event Data =====

  Scenario: Events contain correct agentId
    Given I subscribe to all events
    When I send message "Hello"
    Then all received events should have the correct agentId
