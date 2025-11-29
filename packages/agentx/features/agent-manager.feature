Feature: Agent Manager
  As a developer
  I want to manage agent lifecycle through agentx.agents API
  So that I can define, create, and control AI agents

  Background:
    Given a local AgentX instance

  # ===== Define Agent =====

  Scenario: Define an agent with name and driver
    When I define an agent with:
      | field  | value       |
      | name   | MyAssistant |
      | driver | echoDriver  |
    Then I should get an AgentDefinition
    And the definition name should be "MyAssistant"

  Scenario: Define agent requires name
    When I define an agent without name
    Then it should throw error containing "name is required"

  Scenario: Define agent requires driver
    When I define an agent without driver
    Then it should throw error containing "driver is required"

  # ===== Create Agent =====

  Scenario: Create agent from definition
    Given a defined agent "TestAgent"
    When I create an agent with config:
      | field  | value    |
      | apiKey | test-key |
    Then an Agent instance should be created
    And the agent should have a unique agentId
    And the agent lifecycle should be "running"

  Scenario: Create multiple agents from same definition
    Given a defined agent "MultiAgent"
    When I create 3 agents from the same definition
    Then all agents should have different agentIds
    And all agents should be running

  # ===== Get Agent =====

  Scenario: Get existing agent by ID
    Given a created agent
    When I call agentx.agents.get with the agentId
    Then I should get the same agent instance

  Scenario: Get non-existent agent returns undefined
    When I call agentx.agents.get with "non_existent_id"
    Then I should get undefined

  # ===== Has Agent =====

  Scenario: Check agent exists
    Given a created agent
    Then agentx.agents.has should return true for the agentId
    And agentx.agents.has should return false for "unknown_id"

  # ===== List Agents =====

  Scenario: List all agents
    Given 3 created agents
    When I call agentx.agents.list
    Then I should get an array of 3 agents

  Scenario: List returns empty array when no agents
    When I call agentx.agents.list
    Then I should get an empty array

  # ===== Destroy Agent =====

  Scenario: Destroy agent by ID
    Given a created agent
    When I call agentx.agents.destroy with the agentId
    Then the agent lifecycle should be "destroyed"
    And agentx.agents.has should return false
    And agentx.agents.get should return undefined

  Scenario: Destroy non-existent agent does not throw
    When I call agentx.agents.destroy with "non_existent_id"
    Then it should not throw

  # ===== Destroy All =====

  Scenario: Destroy all agents
    Given 3 created agents
    When I call agentx.agents.destroyAll
    Then all agents should be destroyed
    And agentx.agents.list should return empty array

  # ===== State Change Subscription =====

  Scenario: Subscribe to state changes returns unsubscribe function
    Given a created agent
    When I subscribe to state changes
    Then I should receive the unsubscribe function

  Scenario: Agent initial state is idle
    Given a created agent
    Then the agent state should be "idle"

  Scenario: Unsubscribe function can be called without error
    Given a created agent
    And I subscribe to state changes
    When I unsubscribe from state changes
    Then it should not throw

  # ===== Batch Event Subscription =====

  Scenario: Batch subscribe to multiple events returns single unsubscribe
    Given a created agent
    When I batch subscribe to events:
      | event_type        |
      | text_delta        |
      | assistant_message |
      | error_message     |
    Then I should receive a single unsubscribe function

  Scenario: Batch unsubscribe cleans up all subscriptions
    Given a created agent
    And I batch subscribe to events:
      | event_type        |
      | text_delta        |
      | assistant_message |
    When I call the batch unsubscribe function
    Then it should not throw

  # ===== React API =====

  Scenario: React API subscribes to events with onXxx handlers
    Given a created agent
    When I react with handlers:
      | handler             |
      | onTextDelta         |
      | onAssistantMessage  |
      | onError             |
    Then I should receive a single unsubscribe function

  Scenario: React unsubscribe cleans up all subscriptions
    Given a created agent
    And I react with handlers:
      | handler             |
      | onTextDelta         |
      | onAssistantMessage  |
    When I call the react unsubscribe function
    Then it should not throw

  # ===== Lifecycle Hooks =====

  Scenario: onReady is called immediately when agent is running
    Given a created agent
    When I subscribe to onReady
    Then the onReady handler should have been called

  Scenario: onReady returns unsubscribe function
    Given a created agent
    When I subscribe to onReady
    Then I should receive the unsubscribe function

  Scenario: onDestroy is called when agent is destroyed
    Given a created agent
    And I subscribe to onDestroy
    When I destroy the agent
    Then the onDestroy handler should have been called

  Scenario: onDestroy returns unsubscribe function
    Given a created agent
    When I subscribe to onDestroy
    Then I should receive the unsubscribe function

  # ===== Middleware & Interceptor =====

  Scenario: use() returns unsubscribe function
    Given a created agent
    When I add a middleware
    Then I should receive the unsubscribe function

  Scenario: Middleware can be removed
    Given a created agent
    And I add a middleware
    When I remove the middleware
    Then it should not throw

  Scenario: intercept() returns unsubscribe function
    Given a created agent
    When I add an interceptor
    Then I should receive the unsubscribe function

  Scenario: Interceptor can be removed
    Given a created agent
    And I add an interceptor
    When I remove the interceptor
    Then it should not throw
