Feature: AgentX Factory
  As a developer
  I want to create AgentX instances in different modes
  So that I can use agents locally or connect to remote servers

  # ===== Local Mode =====

  Scenario: Create local AgentX instance (default)
    When I call createAgentX()
    Then I should get an AgentXLocal instance
    And the mode should be "local"
    And it should have agents manager
    And it should have sessions manager
    And it should have errors manager

  # ===== Remote Mode =====

  Scenario: Create remote AgentX instance
    When I call createAgentX with serverUrl "http://localhost:5200"
    Then I should get an AgentXRemote instance
    And the mode should be "remote"
    And it should have agents manager
    And it should have sessions manager
    And it should have platform manager
    And it should NOT have errors manager

  # ===== Instance Independence =====

  Scenario: Multiple AgentX instances are independent
    Given a local AgentX instance "instance1"
    And a local AgentX instance "instance2"
    When I create an agent in "instance1"
    Then the agent should NOT exist in "instance2"
