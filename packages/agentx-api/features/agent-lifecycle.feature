Feature: Agent Lifecycle Management
  As a developer
  I want to manage the agent lifecycle
  So that I can control resources and handle interruptions

  Background:
    Given I have created an agent

  Scenario: Agent has unique ID
    When I create an agent
    Then it should have a unique agent ID
    And the ID should remain constant for the agent's lifetime

  Scenario: Agent tracks session ID
    When I create an agent
    Then it should have a session ID
    And all events should include this session ID

  Scenario: Clear conversation history
    Given I have sent 5 messages to the agent
    When I call agent.clear()
    Then the messages array should be empty
    And any ongoing operation should be aborted

  Scenario: Abort ongoing operation
    Given the agent is processing a long-running request
    When I call agent.clear()
    Then the current operation should be aborted
    And no more events should be emitted for that operation

  Scenario: Destroy agent and cleanup resources
    Given I have an active agent
    When I call agent.destroy()
    Then all resources should be cleaned up
    And the agent should not be usable anymore

  Scenario: Multiple agents in same application
    When I create agent A with model "claude-sonnet-4"
    And I create agent B with model "claude-sonnet-4"
    Then agent A and agent B should have different IDs
    And they should have independent conversation histories
    And messages sent to agent A should not affect agent B

  Scenario: Session persistence across restarts
    Given I have sent messages to an agent
    When I check the session ID
    Then I can use it to identify this conversation
    And I can potentially restore the session later

  Scenario: Graceful error handling during destroy
    Given I have an agent with an ongoing operation
    When I call agent.destroy()
    Then it should abort the operation first
    And then clean up resources
    And it should not throw an error
