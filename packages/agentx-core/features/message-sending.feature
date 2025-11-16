Feature: Message Sending and Response Handling
  As a developer
  I want to send messages and receive responses
  So that I can build conversational AI applications

  Background:
    Given I create and initialize an agent with custom responses

  Scenario: Send simple text message
    When I send message "Hello"
    Then the agent should emit "user_message" event
    And the message should be stored in agent messages
    And the message role should be "user"
    And the message content should be "Hello"

  Scenario: Receive assistant text response
    When I send message "Tell me a joke"
    And the driver responds with "Why did the chicken cross the road?"
    Then I should receive "assistant_message" event
    And the assistant message content should be "Why did the chicken cross the road?"
    And the agent messages should have 2 messages

  Scenario: Multi-turn conversation
    When I send message "My name is Alice"
    And the driver responds with "Nice to meet you, Alice!"
    And I send message "What's my name?"
    And the driver responds with "Your name is Alice."
    Then the agent should have 4 messages in history
    And the messages should be in correct order

  Scenario: Streaming response assembly
    When I send message "Count to three"
    And the driver streams text deltas "One", ", ", "two", ", ", "three"
    Then I should receive "text_delta" events for each chunk
    And the final "assistant_message" should contain "One, two, three"
    And the message assembler should correctly concatenate all deltas

  Scenario: Send message with abort
    When I send message "Write a long essay"
    And the driver starts streaming response
    And I abort the request
    Then the streaming should stop immediately
    And I should receive "stream_complete" state event
    And the partial response should be stored in messages

  Scenario: Concurrent message sending prevention
    When I send message "First message"
    And I try to send message "Second message" before first completes
    Then the second send should throw an error
    And the error message should contain "Agent is busy"

  Scenario: Empty message validation
    When I try to send an empty message ""
    Then it should throw a validation error
    And the error message should contain "Message cannot be empty"

  Scenario: Message history ordering
    When I send messages in sequence:
      | message           |
      | First message     |
      | Second message    |
      | Third message     |
    Then the agent messages should maintain insertion order
    And each message should have an increasing timestamp

  Scenario: Tool use in conversation
    When I send message "What's the weather in Tokyo?"
    And the driver plans tool use "get_weather" with {"city": "Tokyo"}
    And the driver completes tool with result "Sunny, 25°C"
    Then I should receive "tool_use_message" event
    And the tool message should contain tool name "get_weather"
    And the tool message should contain input {"city": "Tokyo"}
    And the tool message should contain result "Sunny, 25°C"
    And the agent messages should include the tool use message

  Scenario: Error during message processing
    When I send message "Trigger error"
    And the driver throws an error "LLM service unavailable"
    Then I should receive "error_message" event
    And the error message should contain "LLM service unavailable"
    And the error should be logged
    And the agent should remain in a recoverable state
