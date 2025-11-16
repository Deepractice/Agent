Feature: Reactor Pattern and Custom Reactors
  As a developer
  I want to create and register custom reactors
  So that I can extend agent behavior with custom event processing

  Background:
    Given a mock driver is available
    And a mock logger is available

  Scenario: Register custom reactor
    Given I create a custom reactor "analytics"
    When I create an agent with the custom reactor
    And I initialize the agent
    Then the custom reactor should be initialized
    And the custom reactor should receive ReactorContext
    And the reactor context should provide access to event bus

  Scenario: Custom reactor receives events
    Given I create a custom reactor that subscribes to "assistant_message"
    And I create and initialize an agent with the reactor
    When I send a message and receive a response
    Then the custom reactor should receive the "assistant_message" event
    And the reactor should be able to process the event data

  Scenario: Multiple custom reactors initialization order
    Given I create custom reactors "reactor-A", "reactor-B", "reactor-C"
    When I create an agent with these reactors in order
    And I initialize the agent
    Then the reactors should be initialized in order: A, B, C
    And all reactors should receive initialization context

  Scenario: Custom reactors destruction order
    Given I create and initialize an agent with reactors "A", "B", "C"
    When I destroy the agent
    Then the reactors should be destroyed in reverse order: C, B, A
    And each reactor destroy method should be called

  Scenario: Reactor subscribes to multiple event types
    Given I create a reactor that subscribes to:
      | event_type          |
      | user_message        |
      | assistant_message   |
      | exchange_response   |
    And I create and initialize an agent with the reactor
    When I send a message and receive a response
    Then the reactor should receive all three event types
    And events should be received in correct order

  Scenario: Reactor error handling
    Given I create a reactor that throws error during initialization
    When I try to initialize the agent
    Then the agent initialization should fail
    And the error should be logged
    And other reactors should not be initialized

  Scenario: Reactor consumes events by type
    Given I create a reactor using consumeByType
    And the reactor subscribes to "text_delta" events
    And I create and initialize an agent with the reactor
    When the driver emits multiple text deltas
    Then the reactor should receive only "text_delta" events
    And it should not receive other event types

  Scenario: Reactor consumes events by pattern
    Given I create a reactor using consumeByPattern
    And the reactor pattern matches "conversation_*" events
    And I create and initialize an agent with the reactor
    When the agent goes through conversation lifecycle
    Then the reactor should receive:
      | event_type            |
      | conversation_start    |
      | conversation_thinking |
      | conversation_end      |
    And it should not receive non-matching events

  Scenario: Reactor unsubscribe
    Given I create a reactor that dynamically unsubscribes
    And I create and initialize an agent with the reactor
    When the reactor unsubscribes after first event
    And I send multiple messages
    Then the reactor should receive only the first event
    And subsequent events should not reach the reactor

  Scenario: Built-in reactors are always registered
    When I create an agent without custom reactors
    And I initialize the agent
    Then the following built-in reactors should be registered:
      | reactor_name          |
      | DriverReactor         |
      | StateMachineReactor   |
      | MessageAssembler      |
      | ExchangeTracker       |

  Scenario: Custom reactor accesses logger
    Given I create a custom reactor that uses logger
    And I create and initialize an agent with custom logger
    When the reactor logs messages
    Then the logs should be sent to the custom logger
    And the log context should include reactor information
