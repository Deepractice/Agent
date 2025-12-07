# Code Review Collaboration Mode

## 协作模式

这是一种代码审查驱动的架构完善模式。

### 角色

- **Reviewer（Claude）**：挑剔地阅读源码，发现问题
- **Architect（用户）**：解答问题，给出方案

### 流程

```
1. Reviewer 读源码
        ↓
2. 发现问题（盲点/架构不清晰/功能不完整/坑）
        ↓
3. 提问，等待 Architect 解答
        ↓
4. Architect 解答
        ↓
5. Reviewer 确认理解，执行修复
        ↓
6. 回到 1，继续读下一块代码
```

### 原则

1. **问题驱动**：不是漫无目的读代码，是带着批判性思维找问题
2. **不轻易动手**：问题没完全清晰、方案没确定之前，不执行
3. **持续追问**：一个问题可以追问多轮，直到完全理解
4. **收敛机制**：通过设计好的 API 边界来收紧问题范围

### 问题分类

- **盲点**：代码里缺失的逻辑，没想到的场景
- **架构不清晰**：职责模糊，依赖关系混乱，概念重叠
- **功能不完整**：接口定义了但没实现，流程断裂
- **坑**：潜在 bug，边界条件，并发问题

### 提问格式

```markdown
**问题 N：[简短标题]**

[具体代码位置]

[问题描述]

[涉及的关键点，用数字列出]
```

### 使用场景

- 新架构设计完成后的验证
- 重构后的完整性检查
- 团队知识传递
- 发现设计盲点

---

## 当前会话问题追踪

### 问题 1：AgentInstance 构造函数需要 SystemBus，但谁来传入？

**代码位置**：`packages/agent/src/agent/AgentInstance.ts:124`

```typescript
constructor(
  definition: AgentDefinition,
  context: AgentContext,
  engine: AgentEngine,
  driver: AgentDriver,
  sandbox: Sandbox,
  bus: SystemBus  // 新加的参数
)
```

**问题**：

1. 谁创建 AgentInstance？是 AgentX 层还是 Ecosystem 层？
2. 如果是 AgentX 层创建，它怎么拿到 Ecosystem 的 SystemBus？
3. 如果多个 Agent，它们共享一个 SystemBus 吗？

**涉及**：AgentX 和 Ecosystem 的关系

**状态**：待解答
