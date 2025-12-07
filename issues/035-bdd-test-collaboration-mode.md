# BDD Test Collaboration Mode

## 协作模式

这是一种 BDD 测试驱动的行为规格定义模式。

### 角色

- **Test Designer（Claude）**：设计测试用例，提出行为问题
- **Architect（用户）**：确认行为规格，解答设计问题

### 流程

```
1. Test Designer 设计 feature 文件（用例草案）
        ↓
2. 展示用例，提出行为问题，等待 Architect 确认
        ↓
3. Architect 确认/修改行为规格
        ↓
4. Test Designer 执行：写 feature 文件 + step definitions
        ↓
5. 运行测试，debug
        ↓
6. 回到 1，继续下一个 feature
```

### 原则

1. **行为先行**：先定义行为（feature），再写实现
2. **不轻易动手**：行为规格没确认之前，不写代码
3. **持续追问**：边界情况、异常路径要问清楚
4. **用户视角**：用例从使用者角度写，不涉及实现细节

---

## 架构决策记录

### 决策 1：Container 不提供删除

- **结论**：Container 是持久化的，不提供 delete 操作
- **原因**：Container 应该封存而不是删除，archive 功能以后再加
- **影响**：ContainerFacade 只有 create/get/list

### 决策 2：Session 提供删除

- **结论**：Session 可以删除
- **影响**：SessionFacade 有 delete 方法

### 决策 3：创建失败抛异常

- **结论**：Session 创建时如果 container/image 不存在，抛异常
- **原因**：明确的错误处理，不用检查返回值

### 决策 4：Destroy 不存在的 Agent 静默

- **结论**：destroy 不存在的 agent 不报错
- **原因**：幂等操作，方便清理逻辑

### 决策 5：Facade 不暴露内部对象

- **结论**：所有操作通过 Facade，不返回 Agent/Session/Container 对象
- **原因**：
  - 包隔离性强，内部实现可随意改
  - AI 编程约束力好，API 表面积小
  - 统一入口，行为可预测
  - 易于测试
- **影响**：
  - SessionFacade.run() 返回 agentId 而不是 Agent
  - AgentFacade 新增 receive/interrupt 方法
  - AgentFacade.get/list 返回 AgentInfo 而不是 Agent

### 决策 6：使用 MockEnvironment 测试

- **结论**：BDD 测试用 MockEnvironment 模拟外部环境
- **原因**：测试边界清晰，Facade 层是真实的，外部环境是模拟的

---

## 测试范围

```
runtime/facade/
├── ContainerFacade    ✅ 已确认
├── SessionFacade      ✅ 已确认
├── AgentFacade        ✅ 已确认
└── EventsFacade       ✅ 已确认
```

---

## Feature 规格（已确认）

### ContainerFacade

```gherkin
Feature: Container Lifecycle Management
  As a developer
  I want to manage containers
  So that I can organize sessions in isolated environments

  Background:
    Given a runtime is initialized

  # ==================== Create ====================

  Scenario: Create container without name
    When I create a container
    Then the container should be created successfully
    And the container should have a unique ID
    And the container createdAt should be set

  Scenario: Create container with name
    When I create a container with name "my-workspace"
    Then the container should be created successfully
    And the container name should be "my-workspace"

  # ==================== Get ====================

  Scenario: Get existing container
    Given a container exists with name "workspace-1"
    When I get the container by its ID
    Then I should receive the container info

  Scenario: Get non-existing container
    When I get container by ID "non-existing-id"
    Then I should receive undefined

  # ==================== List ====================

  Scenario: List containers when empty
    When I list all containers
    Then I should receive an empty list

  Scenario: List multiple containers
    Given the following containers exist:
      | name        |
      | workspace-1 |
      | workspace-2 |
      | workspace-3 |
    When I list all containers
    Then I should receive 3 containers
```

### SessionFacade

```gherkin
Feature: Session Lifecycle Management
  As a developer
  I want to manage sessions within containers
  So that I can persist conversation contexts

  Background:
    Given a runtime is initialized
    And a container "default" exists
    And an image "translator" exists

  # ==================== Create ====================

  Scenario: Create session in container
    When I create a session in container "default" with image "translator"
    Then the session should be created successfully
    And the session should have a unique ID
    And the session containerId should be "default"
    And the session imageId should be "translator"
    And the session createdAt should be set

  Scenario: Create session in non-existing container
    When I create a session in container "non-existing" with image "translator"
    Then it should fail with container not found error

  Scenario: Create session with non-existing image
    When I create a session in container "default" with image "non-existing"
    Then it should fail with image not found error

  # ==================== Get ====================

  Scenario: Get existing session
    Given a session exists in container "default" with image "translator"
    When I get the session by its ID
    Then I should receive the session info

  Scenario: Get non-existing session
    When I get session by ID "non-existing-id"
    Then I should receive undefined

  # ==================== List ====================

  Scenario: List sessions in empty container
    When I list sessions in container "default"
    Then I should receive an empty list

  Scenario: List sessions in container with sessions
    Given the following sessions exist in container "default":
      | image      |
      | translator |
      | assistant  |
    When I list sessions in container "default"
    Then I should receive 2 sessions

  Scenario: List sessions only returns sessions from specified container
    Given a container "other" exists
    And a session exists in container "default" with image "translator"
    And a session exists in container "other" with image "assistant"
    When I list sessions in container "default"
    Then I should receive 1 session

  # ==================== Delete ====================

  Scenario: Delete existing session
    Given a session exists in container "default" with image "translator"
    When I delete the session
    Then the delete should return true
    And the session should not exist

  Scenario: Delete non-existing session
    When I delete session "non-existing-id"
    Then the delete should return false

  # ==================== Run ====================

  Scenario: Run agent from session
    Given a session exists in container "default" with image "translator"
    When I run the session
    Then I should receive an agent ID
    And the agent should be running

  Scenario: Run non-existing session
    When I run session "non-existing-id"
    Then it should fail with session not found error
```

### AgentFacade

```gherkin
Feature: Running Agent Management
  As a developer
  I want to query and interact with running agents
  So that I can control active conversations

  Background:
    Given a runtime is initialized
    And a container "default" exists
    And an image "translator" exists
    And a session "session-1" exists in container "default" with image "translator"

  # ==================== Get ====================

  Scenario: Get running agent info
    Given an agent is running from session "session-1"
    When I get the agent info by its ID
    Then I should receive the agent info
    And the agent info should contain sessionId

  Scenario: Get non-running agent
    When I get agent by ID "non-existing-id"
    Then I should receive undefined

  # ==================== List ====================

  Scenario: List agents when none running
    When I list all running agents
    Then I should receive an empty list

  Scenario: List multiple running agents
    Given a session "session-2" exists in container "default" with image "translator"
    And an agent is running from session "session-1"
    And an agent is running from session "session-2"
    When I list all running agents
    Then I should receive 2 agents

  # ==================== Receive ====================

  Scenario: Send message to running agent
    Given an agent is running from session "session-1"
    When I send message "Hello" to the agent
    Then the agent should process the message

  Scenario: Send message to non-existing agent
    When I send message "Hello" to agent "non-existing-id"
    Then it should fail with agent not found error

  # ==================== Interrupt ====================

  Scenario: Interrupt running agent
    Given an agent is running from session "session-1"
    And the agent is processing a message
    When I interrupt the agent
    Then the agent should return to idle state

  Scenario: Interrupt non-existing agent
    When I interrupt agent "non-existing-id"
    Then it should complete without error

  # ==================== Destroy ====================

  Scenario: Destroy running agent
    Given an agent is running from session "session-1"
    When I destroy the agent
    Then the agent should not be running
    And the session data should be preserved

  Scenario: Destroy non-existing agent
    When I destroy agent "non-existing-id"
    Then it should complete without error
```

### EventsFacade

```gherkin
Feature: Runtime Event Subscription
  As a developer
  I want to subscribe to runtime events
  So that I can react to agent activities

  Background:
    Given a runtime is initialized with MockEnvironment
    And a container "default" exists
    And an image "translator" exists
    And a session exists in container "default" with image "translator"

  # ==================== Subscribe by Type ====================

  Scenario: Subscribe to specific event type
    Given I subscribe to "text_delta" events
    When an agent runs and produces text
    Then I should receive "text_delta" events

  Scenario: Subscribe to multiple event types
    Given I subscribe to "text_delta" events
    And I subscribe to "assistant_message" events
    When an agent runs and produces text
    Then I should receive both event types

  # ==================== Subscribe All ====================

  Scenario: Subscribe to all events
    Given I subscribe to all events
    When an agent runs and produces text
    Then I should receive all event types

  # ==================== Unsubscribe ====================

  Scenario: Unsubscribe stops receiving events
    Given I subscribe to "text_delta" events
    When I unsubscribe
    And an agent runs and produces text
    Then I should not receive any events

  # ==================== Multiple Subscribers ====================

  Scenario: Multiple subscribers receive same events
    Given subscriber A subscribes to "text_delta" events
    And subscriber B subscribes to "text_delta" events
    When an agent runs and produces text
    Then both subscribers should receive the events
```

---

## Facade 类型签名（已更新）

### ContainerFacade

```typescript
interface ContainerFacade {
  create(name?: string): Promise<ContainerInfo>;
  get(containerId: string): Promise<ContainerInfo | undefined>;
  list(): Promise<ContainerInfo[]>;
}
```

### SessionFacade

```typescript
interface SessionFacade {
  create(containerId: string, imageId: string): Promise<SessionInfo>;
  get(sessionId: string): Promise<SessionInfo | undefined>;
  listByContainer(containerId: string): Promise<SessionInfo[]>;
  delete(sessionId: string): Promise<boolean>;
  run(sessionId: string): Promise<string>; // returns agentId
}
```

### AgentFacade

```typescript
interface AgentFacade {
  get(agentId: string): AgentInfo | undefined;
  list(): AgentInfo[];
  receive(agentId: string, message: string): Promise<void>;
  interrupt(agentId: string): void;
  destroy(agentId: string): Promise<void>;
}
```

### EventsFacade

```typescript
interface EventsFacade {
  on<T extends RuntimeEvent["type"]>(
    type: T,
    handler: (event: Extract<RuntimeEvent, { type: T }>) => void
  ): Unsubscribe;
  onAll(handler: (event: RuntimeEvent) => void): Unsubscribe;
}
```

---

## 下一步

1. 创建 features 目录结构
2. 写 feature 文件
3. 写 step definitions + MockEnvironment
4. 运行测试，debug
