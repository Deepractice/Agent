Feature: Client SDK
  As a developer
  I want to connect to remote agents
  So that I can use agents from browser or other services

  Background:
    Given a running AgentX server on port 3456
    And a defined agent "RemoteAgent" with echo driver
    And an agent is created on the server

  # ===== Client Creation =====

  Scenario: Create AgentXClient
    When I create an AgentXClient with baseUrl "http://localhost:3456/agentx"
    Then the client should be created successfully

  # ===== List Agents =====

  Scenario: List remote agents
    When I create an AgentXClient
    And I call client.listAgents()
    Then I should receive a list of agents
    And the list should contain the created agent

  # ===== Connect to Agent =====

  Scenario: Connect to remote agent
    Given an AgentXClient is created
    When I call client.connect with the agentId
    Then I should receive a RemoteAgent instance
    And the RemoteAgent should have the correct agentId

  Scenario: Connect to non-existent agent
    Given an AgentXClient is created
    When I try to connect to "non_existent_agent"
    Then it should throw error containing "not found"

  # ===== Quick Connect =====

  Scenario: Connect using connectAgent helper
    When I call connectAgent with baseUrl and agentId
    Then I should receive a RemoteAgent instance
    And the RemoteAgent should be ready to use

  # ===== Remote Agent Interface =====

  Scenario: RemoteAgent has Agent interface
    Given I am connected to a remote agent
    Then the RemoteAgent should have agentId property
    And the RemoteAgent should have on method
    And the RemoteAgent should have receive method
    And the RemoteAgent should have interrupt method
    And the RemoteAgent should have destroy method

  # ===== Send Message =====

  Scenario: Send message via RemoteAgent
    Given I am connected to a remote agent
    And I subscribe to events
    When I call agent.receive("Hello Remote!")
    Then I should receive stream events
    And I should receive "message_start" event
    And I should receive "text_delta" events
    And I should receive "message_stop" event

  Scenario: Send message and receive assistant_message
    Given I am connected to a remote agent
    And I subscribe to "assistant_message" events
    When I call agent.receive("Echo this message")
    Then I should receive "assistant_message" event
    And the message content should contain "Echo this message"

  # ===== Event Subscription =====

  Scenario: Subscribe to remote agent events
    Given I am connected to a remote agent
    When I call agent.on with a handler
    Then the handler should be registered

  Scenario: Receive events from remote agent
    Given I am connected to a remote agent
    And I subscribe to all events
    When I send a message
    Then the handler should receive events
    And events should have correct agentId

  Scenario: Unsubscribe from remote agent events
    Given I am connected to a remote agent
    And I subscribe to events and get unsubscribe function
    When I call the unsubscribe function
    And I send a message
    Then the handler should not receive events

  # ===== Interrupt =====

  Scenario: Interrupt remote agent
    Given I am connected to a remote agent
    When I call agent.interrupt()
    Then the interrupt should be sent to server

  # ===== Disconnect =====

  Scenario: Disconnect from remote agent
    Given I am connected to a remote agent
    When I call agent.destroy()
    Then the SSE connection should be closed
    And subsequent receive calls should fail

  # ===== Error Handling =====

  Scenario: Handle server unavailable
    Given the server is not running
    When I try to create a client and connect
    Then it should throw connection error

  Scenario: Handle server disconnect during streaming
    Given I am connected to a remote agent
    And I subscribe to events
    When the server stops while streaming
    Then I should receive error event or connection close

  # ===== Reconnection =====

  Scenario: Reconnect after disconnect
    Given I was connected to a remote agent
    And the connection was lost
    When I call client.connect again
    Then a new connection should be established
