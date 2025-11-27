Feature: Server Handler
  As a developer
  I want to expose agents via HTTP
  So that clients can interact with agents over the network

  Background:
    Given a server agent "ServerAgent" is defined
    And an AgentX handler is created

  # ===== Platform Endpoints =====

  Scenario: Get platform info
    When I request GET "/info"
    Then the response status should be 200
    And the response should contain:
      | field      | value   |
      | platform   | AgentX  |
    And the response should have agentCount

  Scenario: Health check
    When I request GET "/health"
    Then the response status should be 200
    And the response should contain:
      | field  | value   |
      | status | healthy |
    And the response should have timestamp

  # ===== Agent Listing =====

  Scenario: List agents when empty
    When I request GET "/agents"
    Then the response status should be 200
    And the response agents array should be empty

  Scenario: List agents with existing agents
    Given an agent "agent_1" is created
    And an agent "agent_2" is created
    When I request GET "/agents"
    Then the response status should be 200
    And the response agents array should have 2 items
    And each agent should have agentId, name, lifecycle, state

  # ===== Get Agent =====

  Scenario: Get existing agent
    Given an agent is created and has agentId
    When I request GET "/agents/{agentId}"
    Then the response status should be 200
    And the response should contain the agent info

  Scenario: Get non-existent agent
    When I request GET "/agents/non_existent"
    Then the response status should be 404
    And the response error code should be "AGENT_NOT_FOUND"

  # ===== Delete Agent =====

  Scenario: Delete existing agent
    Given an agent is created and has agentId
    When I request DELETE "/agents/{agentId}"
    Then the response status should be 204
    And the agent should be destroyed

  Scenario: Delete non-existent agent
    When I request DELETE "/agents/non_existent"
    Then the response status should be 404
    And the response error code should be "AGENT_NOT_FOUND"

  # ===== Send Message =====

  Scenario: Send message to agent
    Given an agent is created and has agentId
    When I request POST "/agents/{agentId}/messages" with:
      | field   | value   |
      | content | Hello!  |
    Then the response status should be 202
    And the response should contain:
      | field  | value      |
      | status | processing |

  Scenario: Send message to non-existent agent
    When I request POST "/agents/non_existent/messages" with:
      | field   | value   |
      | content | Hello!  |
    Then the response status should be 404
    And the response error code should be "AGENT_NOT_FOUND"

  Scenario: Send message without content
    Given an agent is created and has agentId
    When I request POST "/agents/{agentId}/messages" with empty body
    Then the response status should be 400
    And the response error code should be "INVALID_REQUEST"

  # ===== Interrupt =====

  Scenario: Interrupt agent
    Given an agent is created and has agentId
    When I request POST "/agents/{agentId}/interrupt"
    Then the response status should be 200
    And the response should contain:
      | field       | value |
      | interrupted | true  |

  Scenario: Interrupt non-existent agent
    When I request POST "/agents/non_existent/interrupt"
    Then the response status should be 404
    And the response error code should be "AGENT_NOT_FOUND"

  # ===== Not Found =====

  Scenario: Unknown route returns 404
    When I request GET "/unknown/route"
    Then the response status should be 404

  Scenario: Invalid method returns 404
    When I request PUT "/agents"
    Then the response status should be 404
