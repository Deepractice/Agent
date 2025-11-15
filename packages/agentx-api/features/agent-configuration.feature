Feature: Agent Configuration
  As a developer
  I want to configure my agent
  So that it behaves according to my application needs

  Scenario: Create agent with minimal configuration
    When I create an agent with:
      | field  | value                    |
      | apiKey | sk-ant-test-12345        |
      | model  | claude-sonnet-4-20250514 |
    Then the agent should be created successfully

  Scenario: Configure system prompt
    Given I create an agent with system prompt "You are a helpful coding assistant"
    When I send "Help me write a function"
    Then the assistant should respond as a coding assistant

  Scenario: Configure thinking tokens limit
    When I create an agent with:
      | field             | value                    |
      | apiKey            | sk-ant-test-12345        |
      | model             | claude-sonnet-4-20250514 |
      | maxThinkingTokens | 5000                     |
    Then the agent should use up to 5000 thinking tokens

  Scenario: Configure custom API base URL
    When I create an agent with:
      | field   | value                 |
      | apiKey  | sk-ant-test-12345     |
      | model   | claude-sonnet-4       |
      | baseUrl | https://custom-api.com|
    Then the agent should use the custom base URL

  Scenario: Configure MCP servers with stdio transport
    Given I create an agent with MCP server configuration:
      """
      {
        "servers": {
          "filesystem": {
            "command": "node",
            "args": ["./mcp-filesystem.js"],
            "env": {
              "ROOT_PATH": "/workspace"
            }
          }
        }
      }
      """
    When I send "List files in the workspace"
    Then the agent should have access to the filesystem MCP server

  Scenario: Configure MCP servers with SSE transport
    Given I create an agent with MCP server configuration:
      """
      {
        "servers": {
          "remote-tools": {
            "url": "https://mcp.example.com",
            "headers": {
              "Authorization": "Bearer token123"
            }
          }
        }
      }
      """
    Then the agent should connect to the SSE MCP server

  Scenario: Missing required configuration throws error
    When I try to create an agent without apiKey
    Then it should throw an AgentConfigError
    And the error should indicate "apiKey is required"

  Scenario: Missing model configuration throws error
    When I try to create an agent without model
    Then it should throw an AgentConfigError
    And the error should indicate "model is required"

  Scenario: Configuration validation before creation
    Given I have invalid configuration
    When I try to create an agent
    Then the error should be thrown immediately
    And no network requests should be made
