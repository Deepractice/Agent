Feature: Platform Manager
  As a developer
  I want to get remote platform information
  So that I can monitor and manage the AgentX server

  Background:
    Given a remote AgentX instance
    And a mocked server

  # ===== Get Info =====

  Scenario: Get platform info
    Given the server returns platform info:
      | field      | value   |
      | platform   | agentx  |
      | version    | 1.0.0   |
      | agentCount | 5       |
    When I call agentx.platform.getInfo
    Then I should get PlatformInfo
    And the platform should be "agentx"
    And the version should be "1.0.0"
    And the agentCount should be 5

  # ===== Get Health =====

  Scenario: Get health status - healthy
    Given the server returns health status:
      | field      | value   |
      | status     | healthy |
      | agentCount | 3       |
    When I call agentx.platform.getHealth
    Then I should get HealthStatus
    And the status should be "healthy"
    And it should have a timestamp

  Scenario: Get health status - degraded
    Given the server returns health status:
      | field  | value    |
      | status | degraded |
    When I call agentx.platform.getHealth
    Then the status should be "degraded"

  # ===== Local Mode =====

  Scenario: Local mode does not have platform manager
    Given a local AgentX instance
    Then agentx.platform should be undefined
