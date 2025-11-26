Feature: AgentX Core - Agent and Session Management
  As a developer
  I want to manage Agent lifecycle and Sessions
  So that I can build AI agent applications easily

  # ===== Agent Lifecycle =====

  Scenario: Create a new Agent
    Given an initialized core context
    And an agent definition with name "TestAgent"
    When I create an agent with the definition
    Then the agent should be created
    And the agent should be in "running" lifecycle
    And the agent should be in "idle" state
    And the agent should be registered in the container

  Scenario: Get an existing Agent
    Given an initialized core context
    And an existing agent with id "agent_123"
    When I get the agent by id "agent_123"
    Then I should receive the agent
    And the agent id should be "agent_123"

  Scenario: Get non-existent Agent returns undefined
    Given an initialized core context
    When I get the agent by id "non_existent"
    Then I should receive undefined

  Scenario: Destroy an Agent
    Given an initialized core context
    And an existing agent with id "agent_to_destroy"
    When I destroy the agent with id "agent_to_destroy"
    Then the agent should be destroyed
    And the agent should not be in the container

  Scenario: Destroy all Agents
    Given an initialized core context
    And 3 existing agents
    When I destroy all agents
    Then all agents should be destroyed
    And the container should be empty

  # ===== Agent Communication =====

  Scenario: Agent receives a string message
    Given an initialized core context
    And an agent with a mock driver
    When the agent receives message "Hello"
    Then the agent should process the message
    And the agent state should transition to "responding" then back to "idle"

  Scenario: Destroyed agent cannot receive messages
    Given an initialized core context
    And a destroyed agent
    When the agent tries to receive a message
    Then it should throw an error with message "Agent has been destroyed"

  # ===== Agent Events =====

  Scenario: Subscribe to agent events
    Given an initialized core context
    And an agent with a mock driver
    And an event handler subscribed to the agent
    When the agent receives message "Test"
    Then the handler should receive events

  Scenario: Unsubscribe from agent events
    Given an initialized core context
    And an agent with a mock driver
    And an event handler subscribed to the agent
    When I unsubscribe the handler
    And the agent receives message "Test"
    Then the handler should not receive any events

  # ===== Session Management =====

  Scenario: Create a new Session
    Given an initialized core context
    When I create a session with title "My Chat"
    Then the session should be created
    And the session title should be "My Chat"
    And the session should have no messages
    And the session should have no associated agent

  Scenario: Associate Session with Agent
    Given an initialized core context
    And an existing session
    And an existing agent
    When I associate the session with the agent
    Then the session should be associated with the agent

  Scenario: Disassociate Session from Agent
    Given an initialized core context
    And a session associated with an agent
    When I disassociate the session
    Then the session should have no associated agent

  Scenario: Add message to Session
    Given an initialized core context
    And an existing session
    And an existing agent
    When I add a user message "Hello" to the session
    Then the session should have 1 message
    And the message should have role "user"
    And the message should have content "Hello"

  # ===== Container Operations =====

  Scenario: List all agent IDs
    Given an initialized core context
    And 3 existing agents
    When I list all agent IDs
    Then I should receive 3 agent IDs

  Scenario: Get agent count
    Given an initialized core context
    And 5 existing agents
    When I get the agent count
    Then the count should be 5

  Scenario: Check if agent exists
    Given an initialized core context
    And an existing agent with id "existing_agent"
    When I check if agent "existing_agent" exists
    Then it should return true
    When I check if agent "non_existent" exists
    Then it should return false

  # ===== Context Management =====

  Scenario: Context must be initialized before use
    Given an uninitialized context
    When I try to create an agent
    Then it should throw an error with message "Context not initialized"

  Scenario: Reset context clears all state
    Given an initialized core context
    And 3 existing agents
    When I reset the context
    Then the context should be uninitialized
