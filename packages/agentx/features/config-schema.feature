Feature: Config Schema Validation
  As a developer
  I want type-safe configuration validation
  So that I can catch config errors early

  # ===== Type Validation =====

  Scenario: Validate string field type
    Given a config schema with:
      | field | type   | required |
      | name  | string | true     |
    When I validate config with name "Alice"
    Then validation should pass
    And no errors should be returned

  Scenario: Fail validation for wrong type
    Given a config schema with:
      | field | type   | required |
      | name  | string | true     |
    When I validate config with name as number 123
    Then validation should fail
    And errors should contain "name: Expected string, got number"

  Scenario: Validate number field type
    Given a config schema with:
      | field | type   | required |
      | port  | number | true     |
    When I validate config with port 8080
    Then validation should pass

  Scenario: Validate boolean field type
    Given a config schema with:
      | field   | type    | required |
      | enabled | boolean | true     |
    When I validate config with enabled true
    Then validation should pass

  # ===== Required Fields =====

  Scenario: Fail validation when required field missing
    Given a config schema with:
      | field  | type   | required |
      | apiKey | string | true     |
    When I validate config without apiKey
    Then validation should fail
    And errors should contain "apiKey: Required field is missing"

  Scenario: Pass validation when optional field missing
    Given a config schema with:
      | field | type   | required |
      | name  | string | false    |
    When I validate config without name
    Then validation should pass

  # ===== Default Values =====

  Scenario: Apply default value when field missing
    Given a config schema with:
      | field | type   | default |
      | model | string | gpt-4   |
    When I apply defaults to config without model
    Then the result should have model "gpt-4"

  Scenario: Do not override provided value with default
    Given a config schema with:
      | field | type   | default |
      | model | string | gpt-4   |
    When I apply defaults to config with model "claude"
    Then the result should have model "claude"

  # ===== Process Config (Validate + Defaults) =====

  Scenario: Process config applies defaults then validates
    Given a config schema with:
      | field  | type   | required | default              |
      | apiKey | string | true     |                      |
      | model  | string | false    | claude-sonnet-4-20250514 |
    When I process config with apiKey "sk-123"
    Then the result should have apiKey "sk-123"
    And the result should have model "claude-sonnet-4-20250514"

  Scenario: Process config throws on validation failure
    Given a config schema with:
      | field  | type   | required |
      | apiKey | string | true     |
    When I try to process config without apiKey
    Then it should throw ConfigValidationError
    And the error should contain "apiKey: Required field is missing"

  # ===== Multiple Fields =====

  Scenario: Validate multiple fields
    Given a config schema with:
      | field       | type    | required |
      | apiKey      | string  | true     |
      | maxTokens   | number  | false    |
      | stream      | boolean | false    |
    When I validate config with:
      | field     | value  |
      | apiKey    | sk-123 |
      | maxTokens | 1000   |
      | stream    | true   |
    Then validation should pass

  Scenario: Report all validation errors
    Given a config schema with:
      | field  | type   | required |
      | name   | string | true     |
      | apiKey | string | true     |
    When I validate config without any fields
    Then validation should fail
    And errors should contain "name: Required field is missing"
    And errors should contain "apiKey: Required field is missing"
