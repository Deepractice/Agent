Feature: Agent Lifecycle
  As a developer
  I want to create and manage agent instances
  So that I can run AI agents in my application

  # ===== Agent Creation =====

  Scenario: Create an agent from definition
    Given a defined agent "TestAgent" with echo driver
    When I create an agent with config:
      | field  | value    |
      | apiKey | test-key |
    Then an agent instance should be created
    And the agent should have a unique agentId
    And the agent lifecycle should be "running"
    And the agent state should be "idle"

  Scenario: Create agent via agentx singleton
    Given a defined agent "SingletonTest" with echo driver
    When I create an agent via agentx.createAgent
    Then the agent should be registered in agentx
    And agentx.hasAgent should return true for the agentId

  Scenario: Create multiple agents from same definition
    Given a defined agent "MultiAgent" with echo driver
    When I create 3 agents from the same definition
    Then all agents should have different agentIds
    And all agents should be running

  # ===== Agent Retrieval =====

  Scenario: Get agent by ID
    Given a created agent with id "agent_123"
    When I call getAgent with "agent_123"
    Then I should get the same agent instance

  Scenario: Get non-existent agent returns undefined
    When I call getAgent with "non_existent"
    Then I should get undefined

  Scenario: Check agent existence with hasAgent
    Given a created agent with known id
    Then hasAgent should return true for the agentId
    And hasAgent should return false for "unknown_agent"

  # ===== Agent Destruction =====

  Scenario: Destroy an agent
    Given a created agent with known id
    When I call destroyAgent with the agentId
    Then the agent lifecycle should be "destroyed"
    And hasAgent should return false for the agentId
    And getAgent should return undefined for the agentId

  Scenario: Destroy all agents
    Given 3 created agents
    When I call destroyAll
    Then all agents should be destroyed
    And agentx should have no agents

  Scenario: Destroyed agent cannot receive messages
    Given a created agent with known id
    When I destroy the agent
    And I try to send a message to the destroyed agent
    Then it should throw error containing "destroyed"

  # ===== Custom AgentX Instance =====

  Scenario: Create custom AgentX instance
    When I create a custom AgentX instance
    Then it should be independent from default agentx
    And agents created in custom instance should not appear in default

  Scenario: Create AgentX with custom container
    Given a custom memory container
    When I create AgentX with the custom container
    Then the AgentX should use the custom container
