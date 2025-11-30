# AgentX Runtime 设计讨论

## 背景

### 商业模式驱动

核心理念：**极致的成本低**

```
传统智能体产品商 (Coze/Dify)
  Token × 1.3 + 平台费 $20-50/月
  功能多，但贵

我们的定位
  Token × 1.05 + $0
  功能一样多，但便宜 → 靠运维成本极低实现

LLM 代理商 (OpenRouter)
  Token × 1.1
  便宜，但没有智能体功能
```

**本质**：不是卖智能体产品，是卖 LLM Token。智能体功能免费送，只收 Token 钱。运维成本压到极致 = 价格可以比任何人低。

### 技术目标

基于 Cloudflare 全家桶（Workers + R2 + D1 + KV + Containers）构建百万级用户平台，月成本控制在 $200 以内。

关键策略：

- 分层执行：能用 Workers（免费）就不用 Container
- Container 按需启动、用完即销
- 智能调度：自动选择最便宜的执行方式

## 当前架构调整

### 已完成

1. **删除 agentx-core 的 Session**
   - Session 是可选的上下文管理器，不属于 Agent 核心
   - Agent 是无状态的消息处理器
   - Session 后续重新设计

2. **重命名 agentx-core → agentx-agent**
   - 更准确反映其职责：Agent 运行时
   - 只包含 Agent 相关代码

3. **创建 agentx-runtime 包**
   - 平台级运行时
   - 管理共享资源和基础设施

### 命名决策

```
AgentXRuntime = 平台级运行时环境（新建）
AgentContainer = Agent 实例容器（保持不变）

Runtime = 运行时环境，有生命周期（start/stop）
Container = 存储容器，装东西（add/remove）
```

## 核心问题：Runtime 应该抽象什么？

### 错误方向 1：业务组件拼凑

```typescript
// 只是把组件凑在一起，没有价值
interface AgentXRuntime {
  agents: AgentStore;
  sessions: SessionStore;
  engine: AgentEngine;
  errors: ErrorManager;
}
```

问题：这只是 Service Locator，不是真正的"运行时"。

### 错误方向 2：Serverless 基础设施抽象

```typescript
// 抽象层级太低，我们不是做 serverless
interface AgentXRuntime {
  memory: MemoryProvider;
  storage: StorageProvider;
  network: NetworkProvider;
  sandbox: SandboxProvider;
}
```

问题：这是在做 serverless 平台，偏离了 AI Agent 框架的定位。

### 正确方向：待讨论

应该从 AI Agent 的角度思考：

- Agent 真正需要什么资源？
- 这些资源如何在不同环境（本地、分布式、Edge）统一抽象？
- 如何做到"写一次，到处运行"？

## 参考：业界做法

| 项目              | 定位         | 关键设计             |
| ----------------- | ------------ | -------------------- |
| Docker/containerd | 容器运行时   | 隔离、镜像、资源限制 |
| JVM               | 语言运行时   | 字节码、GC、跨平台   |
| Deno              | JS 运行时    | 权限模型、安全沙箱   |
| AWS Lambda        | 函数运行时   | 冷启动、按需计费     |
| LangGraph Cloud   | Agent 运行时 | 状态管理、检查点     |

## 待解决问题

1. **Runtime 的核心抽象是什么？**
   - 不是底层资源（Memory/Storage/Network）
   - 不是业务组件拼凑
   - 应该是 AI Agent 特有的某种抽象

2. **跨环境运行如何实现？**
   - 本地开发
   - Docker 自托管
   - Kubernetes 集群
   - Cloudflare Edge

3. **成本优化如何体现在架构中？**
   - 分层执行（Workers vs Container）
   - 智能调度
   - 资源复用

## 下一步

- [ ] 研究 LangGraph、AutoGen 等框架的运行时设计
- [ ] 从 Agent 执行过程分析真正需要的资源
- [ ] 设计符合 AI Agent 特点的抽象层
- [ ] 考虑开源社区的通用性 vs 商业场景的成本优化

## 相关文件

- `packages/agentx-runtime/src/index.ts` - 当前 ADR
- `packages/agentx-agent/` - Agent 运行时（原 agentx-core）
- `packages/agentx/src/AgentX.ts` - 平台入口

## 日期

2024-11-30
