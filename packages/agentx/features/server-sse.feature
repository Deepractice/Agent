Feature: Server SSE Transport
  As a developer
  I want to receive agent events via SSE
  So that I can stream AI responses to clients

  Background:
    Given a server agent "SSEAgent" is defined
    And an AgentX handler is created
    And an agent is created and has agentId

  # ===== SSE Connection =====

  Scenario: Connect to agent SSE endpoint
    When I request GET "/agents/{agentId}/sse"
    Then the response should be SSE stream
    And the response content-type should be "text/event-stream"

  Scenario: SSE connection to non-existent agent
    When I request GET "/agents/non_existent/sse"
    Then the response status should be 404
    And the response error code should be "AGENT_NOT_FOUND"

  # ===== Event Streaming =====

  Scenario: Receive stream events via SSE
    Given I connect to SSE for the agent
    When I send a message "Hello SSE" via POST
    Then I should receive SSE event "message_start"
    And I should receive SSE events "text_delta"
    And I should receive SSE event "message_stop"

  Scenario: SSE events contain correct data format
    Given I connect to SSE for the agent
    When I send a message "Test format" via POST
    Then each SSE event should have "event" field
    And each SSE event should have "data" field as JSON
    And the data should contain "type", "uuid", "agentId", "timestamp"

  # ===== Multiple Connections =====

  Scenario: Multiple SSE connections to same agent
    Given I connect to SSE for the agent as "client1"
    And I connect to SSE for the agent as "client2"
    When I send a message "Broadcast" via POST
    Then both "client1" and "client2" should receive events

  # ===== Connection Lifecycle =====

  Scenario: SSE connection closes on agent destroy
    Given I connect to SSE for the agent
    When I delete the agent via DELETE
    Then the SSE connection should close

  Scenario: Hooks are called on SSE connect
    Given handler hooks are configured
    When I connect to SSE for the agent
    Then onConnect hook should be called with agentId and connectionId

  Scenario: Hooks are called on SSE disconnect
    Given handler hooks are configured
    And I connect to SSE for the agent
    When I close the SSE connection
    Then onDisconnect hook should be called with agentId and connectionId

  # ===== Error Handling =====

  Scenario: SSE connection to destroyed agent
    Given the agent is destroyed
    When I request GET "/agents/{agentId}/sse"
    Then the response status should be 410
    And the response error code should be "AGENT_DESTROYED"
