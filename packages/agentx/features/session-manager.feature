Feature: Session Manager
  As a developer
  I want to manage conversation sessions through agentx.sessions API
  So that I can track and organize agent conversations

  # ===== Local Mode Sessions =====

  Scenario: Create session for agent (Local)
    Given a local AgentX instance
    And a created agent
    When I call agentx.sessions.create with the agentId
    Then I should get a Session object
    And the session should have a unique sessionId
    And the session agentId should match

  Scenario: Get session by ID
    Given a local AgentX instance
    And a created session
    When I call agentx.sessions.get with the sessionId
    Then I should get the same session

  Scenario: Get non-existent session returns undefined
    Given a local AgentX instance
    When I call agentx.sessions.get with "non_existent_id"
    Then I should get undefined

  Scenario: List sessions by agent
    Given a local AgentX instance
    And a created agent
    And 3 sessions for the agent
    When I call agentx.sessions.listByAgent with the agentId
    Then I should get an array of 3 sessions

  Scenario: List sessions for agent with no sessions
    Given a local AgentX instance
    And a created agent
    When I call agentx.sessions.listByAgent with the agentId
    Then I should get an empty array

  Scenario: Destroy session
    Given a local AgentX instance
    And a created session
    When I call agentx.sessions.destroy with the sessionId
    Then agentx.sessions.get should return undefined

  # ===== Remote Mode Sessions =====

  Scenario: Create session (Remote) is async
    Given a remote AgentX instance
    And a mocked server
    When I call agentx.sessions.create with agentId
    Then it should return a Promise
    And the Promise should resolve to a Session

  Scenario: Sync sessions with remote server
    Given a remote AgentX instance
    And a mocked server with sessions
    When I call agentx.sessions.sync
    Then local cache should be updated from server
