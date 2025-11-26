Feature: Agent Lifecycle Management
  As a developer
  I want to manage agent lifecycle (initialize, send, destroy)
  So that I can properly create and clean up agent instances

  Background:
    Given a mock driver is available
    And a mock logger is available

  Scenario: Successful agent initialization
    Given I create an agent service with the mock driver
    When I initialize the agent
    Then the agent should be in "ready" state
    And the agent should emit "agent_ready" state event
    And the agent should have a valid session ID
    And the agent should have a valid agent ID

  Scenario: Agent initialization with custom reactors
    Given I create a custom reactor called "analytics"
    And I create an agent service with custom reactors
    When I initialize the agent
    Then the custom reactor should be initialized
    And the custom reactor should receive initialization context

  Scenario: Send message after initialization
    Given I create and initialize an agent
    When I send message "Hello, how are you?"
    Then the agent should emit "user_message" event
    And the user message content should be "Hello, how are you?"
    And the agent messages should contain the user message

  Scenario: Destroy agent cleanly
    Given I create and initialize an agent
    When I destroy the agent
    Then all reactors should be destroyed in reverse order
    And the driver should be destroyed
    And the event bus should be cleaned up

  Scenario: Clear message history
    Given I create and initialize an agent
    And I send message "First message"
    And I send message "Second message"
    When I clear the agent history
    Then the agent messages should be empty

  Scenario: Prevent operations before initialization
    Given I create an agent service without initialization
    When I try to send a message
    Then it should throw an error with message "Agent not initialized"

  Scenario: Prevent operations after destruction
    Given I create and initialize an agent
    And I destroy the agent
    When I try to send a message
    Then it should throw an error with message "Agent not initialized"
