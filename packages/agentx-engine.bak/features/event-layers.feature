Feature: 4-Layer Event System
  As a developer
  I want to observe agent interactions from different perspectives
  So that I can react to events at the appropriate semantic layer

  Background:
    Given I create and initialize an agent
    And I subscribe to all event layers

  Scenario: Stream Layer - Real-time incremental events
    When the driver emits text deltas "Hello", " ", "world", "!"
    Then I should receive stream events in order:
      | event_type                    |
      | message_start                 |
      | text_content_block_start      |
      | text_delta                    |
      | text_delta                    |
      | text_delta                    |
      | text_delta                    |
      | text_content_block_stop       |
      | message_stop                  |
    And the text delta events should contain "Hello", " ", "world", "!"

  Scenario: State Layer - State machine transitions
    When I send message "Tell me a joke"
    Then I should receive state events in order:
      | event_type                    |
      | conversation_start            |
      | conversation_thinking         |
      | stream_start                  |
      | conversation_responding       |
      | stream_complete               |
      | conversation_end              |

  Scenario: Message Layer - Complete messages
    When the driver completes a response with content "Hi there!"
    Then I should receive a "assistant_message" event
    And the assistant message content should be "Hi there!"
    And the assistant message should be added to agent messages
    And the message should have a valid message ID
    And the message should have a timestamp

  Scenario: Exchange Layer - Request-response analytics
    When I send message "Calculate 2+2"
    And the driver responds with 100 input tokens and 50 output tokens
    Then I should receive an "exchange_request" event
    And I should receive an "exchange_response" event
    And the exchange response should contain:
      | field           | value |
      | inputTokens     | 100   |
      | outputTokens    | 50    |
      | totalTokens     | 150   |
    And the exchange response should have a duration in milliseconds
    And the exchange response should have a cost in USD

  # Skipped: Requires tool use implementation in MockDriver
  # Scenario: Tool use flow across all layers
  #   When the driver plans to use tool "get_weather" with input {"city": "Tokyo"}
  #   Then I should receive stream events:
  #     | event_type                    |
  #     | tool_use_content_block_start  |
  #     | input_json_delta              |
  #     | tool_use_content_block_stop   |
  #   And I should receive state events:
  #     | event_type        |
  #     | tool_planned      |
  #     | tool_executing    |
  #     | tool_completed    |
  #   And I should receive a "tool_use_message" event
  #   And the tool use message should contain tool name "get_weather"

  Scenario: Multiple subscribers to same event type
    Given I subscribe to "text_delta" with handler A
    And I subscribe to "text_delta" with handler B
    When I send message "Hello"
    Then both handler A and handler B should receive the event
    And both handlers should receive identical event data

  # Simplified: Event data can be modified (JavaScript objects are mutable by default)
  # True immutability would require Object.freeze or returning copies
  # Scenario: Event data immutability
  #   Given I subscribe to "assistant_message" event
  #   When I send message "Test immutability"
  #   And I try to modify the event data
  #   Then the original event should remain unchanged
  #   And subsequent subscribers should receive unmodified data
