Feature: Stateless AgentEngine
  As a developer
  I want a stateless AgentEngine
  So that I can horizontally scale my AI agent service

  # ===== Core Functionality =====

  Scenario: Engine produces stream events from driver
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Hello" for agent "agent_1"
    Then the presenter should have received events
    And the events should include "message_start"
    And the events should include "text_delta"
    And the events should include "message_stop"

  Scenario: Engine assembles assistant message from stream events
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Hello" for agent "agent_1"
    Then the events should include "assistant_message"
    And the assistant message should contain "Hello"

  Scenario: Engine produces state events
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Test" for agent "agent_1"
    Then the events should include "conversation_start"
    And the events should include "conversation_responding"
    And the events should include "conversation_end"

  # ===== Stateless Design =====

  Scenario: Engine is stateless - handles multiple agents
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Hello A" for agent "agent_1"
    And the engine receives "Hello B" for agent "agent_2"
    Then agent "agent_1" events should contain "Hello A"
    And agent "agent_2" events should contain "Hello B"

  Scenario: Engine has no internal state storage
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Test" for agent "agent_1"
    Then the engine should have no state field
    And the engine should have no store field

  # ===== AgentId Propagation =====

  Scenario: All events carry correct agentId
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Test" for agent "my_agent_123"
    Then all events should have agentId "my_agent_123"

  # ===== Event Ordering =====

  Scenario: Events are received in correct order
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Test" for agent "agent_1"
    Then "message_start" should come before "text_delta"
    And "text_delta" should come before "message_stop"
    And "message_stop" should come before "assistant_message"

  # ===== Multiple Presenters =====

  Scenario: Multiple presenters all receive events
    Given a mock echo driver
    And a presenter named "presenter_1"
    And a presenter named "presenter_2"
    And an AgentEngine with multiple presenters
    When the engine receives "Test" for agent "agent_1"
    Then presenter "presenter_1" should have received events
    And presenter "presenter_2" should have received events

  Scenario: Presenter error does not stop other presenters
    Given a mock echo driver
    And a presenter that throws error
    And a presenter named "working"
    And an AgentEngine with multiple presenters
    When the engine receives "Test" for agent "agent_1"
    Then presenter "working" should have received events
    And the engine should not throw

  # ===== Typed Presenters =====

  Scenario: Stream presenter only receives stream events
    Given a mock echo driver
    And a typed stream presenter
    And an AgentEngine
    When the engine receives "Test" for agent "agent_1"
    Then the stream presenter should have stream events
    And the stream presenter should not have message events
    And the stream presenter should not have state events

  Scenario: Message presenter only receives message events
    Given a mock echo driver
    And a typed message presenter
    And an AgentEngine
    When the engine receives "Test" for agent "agent_1"
    Then the message presenter should have message events
    And the message presenter should not have stream events

  Scenario: State presenter only receives state events
    Given a mock echo driver
    And a typed state presenter
    And an AgentEngine
    When the engine receives "Test" for agent "agent_1"
    Then the state presenter should have state events
    And the state presenter should not have stream events

  # ===== Event Re-injection =====

  Scenario: Processor outputs are re-injected for chaining
    Given a mock echo driver
    And a collecting presenter
    And an AgentEngine
    When the engine receives "Test" for agent "agent_1"
    Then assistant_message should be processed by turn tracker
    And state events should be produced from stream events

  # ===== Driver Integration =====

  Scenario: Driver streams text character by character
    Given a driver that streams "ABC" char by char
    And a collecting presenter
    And an AgentEngine
    When the engine receives "anything" for agent "agent_1"
    Then should receive 3 text_delta events
    And combined text should be "ABC"

  Scenario: Empty message produces no assistant_message
    Given a driver that streams empty text
    And a collecting presenter
    And an AgentEngine
    When the engine receives "anything" for agent "agent_1"
    Then the events should not include "assistant_message"
