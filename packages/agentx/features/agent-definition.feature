Feature: Agent Definition
  As a developer
  I want to define agents with configurable schema
  So that I can create type-safe, reusable agent templates

  # ===== Basic Definition =====

  Scenario: Define a simple agent with name and driver
    Given a mock echo driver
    When I define an agent with name "MyAgent" and the driver
    Then the agent definition should have name "MyAgent"
    And the agent definition should have the driver

  Scenario: Define an agent with description
    Given a mock echo driver
    When I define an agent with:
      | name        | DescribedAgent           |
      | description | An agent with description |
    Then the agent definition should have description "An agent with description"

  # ===== Config Schema =====

  Scenario: Define an agent with config schema
    Given a mock echo driver
    When I define an agent with config schema:
      | field    | type   | required |
      | apiKey   | string | true     |
      | model    | string | false    |
    Then the agent definition should have config schema
    And the config schema should have field "apiKey" of type "string"
    And the config schema field "apiKey" should be required

  Scenario: Define an agent with default config values
    Given a mock echo driver
    When I define an agent with config schema:
      | field | type   | default              |
      | model | string | claude-sonnet-4-20250514 |
    Then the config schema field "model" should have default "claude-sonnet-4-20250514"

  # ===== Validation =====

  Scenario: Fail to define agent without name
    Given a mock echo driver
    When I try to define an agent without name
    Then it should throw error containing "name is required"

  Scenario: Fail to define agent without driver
    When I try to define an agent without driver
    Then it should throw error containing "driver is required"

  # ===== Immutability =====

  Scenario: Agent definition should be frozen
    Given a mock echo driver
    When I define an agent with name "FrozenAgent" and the driver
    Then the agent definition should be frozen
    And modifying the definition should throw error
