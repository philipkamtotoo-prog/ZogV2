# Zog V2 LLM 架构与 BYOK 方案

## 1. 文档目标

这份文档用于正式定义 Zog V2 的 LLM 分层方案，目标有三件事：

1. 把 LLM 功能区拆清楚，职责边界稳定下来。
2. 让每个功能区都能单独配置 provider / baseUrl / model / key / prompt。
3. 为后续 BYOK 的“分角色选模型”UI 提供确定的数据结构和开发顺序。

本方案采用：

- `5 个正式 LLM 功能区`
- `1 个可选的裁判顾问功能区`

其中“裁判顾问”默认关闭，不拥有真实裁判权。

---

## 2. 先说结论

V1 那种“按功能拆角色，并允许每个角色单独指定模型”的方法，完全适用于现在的 V2，而且应该升级为正式架构。

V2 当前代码虽然已经有一部分拆分：

- `ActorBrain` 独立
- `CommandGate` 独立
- `Reporter` prompt 层部分独立

但整体仍然存在三个问题：

1. `BYOK` 还是单一全局配置，不能按角色选模型。
2. `Reporter` 和 `Director` 还没有完全变成独立 provider 槽位。
3. 后续调 prompt 时，仍然会出现“角色职责不够清、配置不够独立”的问题。

所以 V2 的正确目标不是继续堆 prompt 文件，而是先把“角色槽位”冻结。

---

## 3. 当前代码状态评估

### 3.1 已经相对独立的部分

#### A. 演员 ActorBrain

- 职责：演员表演、说话、选行动
- 当前状态：已经有独立 provider 和独立 prompt
- 现状评价：`GOOD`

#### B. 预审大法官 CommandGate

- 职责：审查玩家上帝指令，输出 `ALLOW / ASK / DOWNGRADE / REJECT`
- 当前状态：已经有独立 provider 和独立 prompt
- 现状评价：`GOOD`

### 3.2 逻辑上存在，但工程上没彻底独立的部分

#### C. 战地记者 Reporter

- 职责：战中播报、阶段简报、战后总报告
- 当前状态：
  - 战中 reporter prompt 存在
  - 战后 reporter prompt 存在
  - 但 provider/config 仍共用同一套 `LLMConfig`
- 现状评价：`PARTIAL`

#### D. 导演 Director / Showrunner

- 职责：节目节奏控制、导演信号生成、非玩家来源的节目引导
- 当前状态：
  - 文档概念上存在
  - 代码里尚未形成独立 provider / runtime
  - 当前更像 `CommandGate + directorBroadcast`
- 现状评价：`MISSING`

### 3.3 当前不是 LLM 的部分

#### E. 裁判 Referee

- 职责：伤害、状态、淘汰、分数、道具规则、胜负裁定
- 当前状态：纯硬规则 `CombatReferee`
- 现状评价：`INTENTIONAL`

这部分不是缺失，而是当前设计原则本来就要求它是硬规则。

---

## 4. 正式 LLM 功能区定义

V2 正式定义以下 5 个 LLM 功能区：

| 功能区 ID | 中文名 | 是否首发必做 | 主要职责 |
| --- | --- | --- | --- |
| `actor_brain` | 演员脑 | 是 | 表演、台词、行动选择、角色风格 |
| `command_gate` | 预审大法官 | 是 | 审查玩家上帝指令、判定 ASK/ALLOW/REJECT |
| `showrunner_director` | 导演 / 节目总控 | 是 | 生成节目广播、控制节目节奏、制造看点 |
| `live_reporter` | 战中记者 | 是 | 战中口播、阶段简报、名场面播报 |
| `final_reporter` | 战后记者 | 是 | 赛后战报、黑历史、事故总结、Zog 批注整理 |

此外定义一个可选功能区：

| 功能区 ID | 中文名 | 默认状态 | 主要职责 |
| --- | --- | --- | --- |
| `referee_llm_advisor` | 裁判顾问 | 关闭 | 提供戏剧系数建议、风格标签、演出解释，不决定真实结算 |

---

## 5. 五个功能区的职责边界

### 5.1 `actor_brain`

输入：

- 当前 battle state 的可见信息
- 自己的角色设定
- 已注入的 prompt
- 导演广播

输出：

- 角色台词
- 行动意图
- 行动理由

禁止：

- 不得直接决定真实伤害数值
- 不得直接改 battle state
- 不得直接决定胜负

### 5.2 `command_gate`

输入：

- 玩家输入的原始上帝指令
- 当前上下文
- 目标歧义信息

输出：

- `ALLOW`
- `ASK`
- `DOWNGRADE`
- `REJECT`
- 若允许，则输出可注入 broadcast draft

禁止：

- 不负责节目长期节奏
- 不负责裁判规则
- 不负责生成战报

### 5.3 `showrunner_director`

输入：

- 当前 battle state
- reporter memory
- 节目阶段
- 已发生的重要事件

输出：

- 导演广播
- 节目阶段信号
- 额外刺激/催化建议
- 给演员的节目引导语气

这个角色和 `command_gate` 的核心区别：

- `command_gate` 负责“玩家指令能不能过”
- `showrunner_director` 负责“节目接下来应该往哪推”

所以二者必须拆开，不能长期混为一个 prompt。

### 5.4 `live_reporter`

输入：

- event log
- reporter memory
- 当前阶段

输出：

- 战中播报
- 阶段简报
- 名场面口播

禁止：

- 不参与战斗规则
- 不参与玩家指令审批

### 5.5 `final_reporter`

输入：

- event log
- reporter memory
- final score / ranking / bill

输出：

- 战后总结
- 羞辱记录
- 节目事故总结
- 玩家插手记录
- Zog 批注整理

### 5.6 `referee_llm_advisor`（可选）

输入：

- 演员行动文本
- 基础规则上下文

输出建议：

- 戏剧强度标签
- 演出伤害系数建议
- 镜头感说明

限制：

- 不能直接改真实伤害
- 不能跳过 `CombatReferee`
- 所有输出都必须经过硬规则 clamp

推荐做法：

- 输出 `impactTag`
- 输出 `flavorMultiplierSuggestion`
- 输出 `cinematicReason`

不推荐做法：

- 让它直接决定真实伤害值
- 让它直接决定淘汰、得分、胜负

---

## 6. 总体分层关系

推荐采用以下稳定分层：

1. `Referee / Core Rules`
2. `LLM Roles`
3. `BattleEngine Orchestration`
4. `DisplayEvent / Pixi / React`

其中职责如下：

### 第一层：Referee / Core Rules

- `CombatReferee`
- `finalScore`
- 道具规则
- 状态规则
- 结算规则

这层是唯一真实规则层。

### 第二层：LLM Roles

- `actor_brain`
- `command_gate`
- `showrunner_director`
- `live_reporter`
- `final_reporter`
- 可选 `referee_llm_advisor`

这层只负责生成“解释、表演、广播、摘要、建议”，不直接拥有事实权。

### 第三层：BattleEngine Orchestration

负责把：

- battle state
- LLM 输出
- player input
- event log

串起来，变成可执行的战斗流程。

### 第四层：Display

- `DisplayEvent`
- React UI
- Pixi runtime

只消费事实和表现事件，不参与规则判断。

---

## 7. 为什么导演必须独立出来

如果导演继续和 `command_gate` 耦合，会有四个坏处：

1. 玩家指令审查和节目节奏会互相污染 prompt。
2. 你无法单独给导演换模型。
3. 你无法单独调导演的语气、风格、节奏策略。
4. 后续做“自动节目推进”时会被迫继续塞进 command gate。

所以必须明确：

- `command_gate` = 法官
- `showrunner_director` = 导演

一个管准入，一个管节目。

---

## 8. 为什么裁判不建议重新变成真正的 LLM 裁判

V1 的“LLM 裁判”在体验上是有魅力的，但 V2 不建议把真实裁判权交回 LLM。

原因：

1. 数值会飘
2. 不同模型会导致胜负变化
3. debug 成本会非常高
4. prompt 微调会污染核心规则
5. 你后续做平衡时会非常痛苦

因此 V2 推荐策略是：

- `真实裁判` 永远是硬规则
- `LLM 裁判顾问` 只做附加戏剧建议

这样你既保留了 AI 的味道，也不会把底层数值稳定性炸掉。

---

## 9. BYOK 新架构目标

当前代码里，`byokConfig.ts` 是单一配置：

- 一个 provider
- 一个 baseUrl
- 一个 model
- 一个 apiKey

这不符合 V2 的目标。

V2 的 BYOK 目标必须改成：

- 每个 LLM 功能区一个独立槽位
- 每个槽位都可以单独启用/禁用
- 每个槽位都可以单独选 provider / baseUrl / model / key
- 每个槽位都可以单独配 timeout / debug / thinking / temperature

---

## 10. 建议的数据结构

### 10.1 角色 ID

```ts
export type LLMRoleId =
  | 'actor_brain'
  | 'command_gate'
  | 'showrunner_director'
  | 'live_reporter'
  | 'final_reporter'
  | 'referee_llm_advisor';
```

### 10.2 单角色配置

```ts
export type LLMProviderId = 'deepseek' | 'openai' | 'custom';
export type LLMDebugMode = 'off' | 'summary' | 'verbose';

export interface RoleLLMConfig {
  roleId: LLMRoleId;
  enabled: boolean;
  providerId: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  thinkingEnabled: boolean;
  debugMode: LLMDebugMode;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  promptVersion?: string;
  systemPromptOverride?: string;
  tags?: string[];
}
```

### 10.3 全局配置容器

```ts
export interface LLMRoleConfigMap {
  version: 2;
  updatedAt: number;
  defaultRoleFallback?: LLMRoleId;
  roles: Record<LLMRoleId, RoleLLMConfig>;
}
```

### 10.4 推荐默认值

```ts
export const DEFAULT_ROLE_LLM_CONFIGS: Record<LLMRoleId, RoleLLMConfig> = {
  actor_brain: {
    roleId: 'actor_brain',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-pro',
    timeout: 25000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.9,
    maxTokens: 1200,
  },
  command_gate: {
    roleId: 'command_gate',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 15000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.2,
    maxTokens: 500,
  },
  showrunner_director: {
    roleId: 'showrunner_director',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-pro',
    timeout: 20000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.8,
    maxTokens: 900,
  },
  live_reporter: {
    roleId: 'live_reporter',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 15000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.7,
    maxTokens: 700,
  },
  final_reporter: {
    roleId: 'final_reporter',
    enabled: true,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-pro',
    timeout: 25000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.8,
    maxTokens: 1500,
  },
  referee_llm_advisor: {
    roleId: 'referee_llm_advisor',
    enabled: false,
    providerId: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    timeout: 10000,
    thinkingEnabled: false,
    debugMode: 'off',
    temperature: 0.2,
    maxTokens: 300,
  },
};
```

---

## 11. 字段设计说明

### 11.1 为什么每个角色都要单独存 `apiKey`

因为你的真实需求是：

- 裁判/法官可以走便宜快模型
- 演员/记者可以走更会演的模型
- 不同角色甚至可能走不同平台

如果还共用一套 `apiKey + baseUrl + model`，那不叫角色化 BYOK，只是全局 BYOK。

### 11.2 为什么保留 `systemPromptOverride`

因为你后续一定会遇到两类需求：

1. 改正式 prompt 文件
2. 临时在线覆盖某个角色 prompt

保留 override 字段后，debug 和实验会方便很多。

### 11.3 为什么要有 `promptVersion`

因为后续调 prompt 时，战报、事故、debug 里最好能知道：

- 这次是哪个 prompt 版本出的结果

否则你很难做回归对比。

### 11.4 为什么要有 `enabled`

因为你后面会需要：

- 关闭导演
- 关闭 live reporter
- 临时启用 referee advisor

如果没有 `enabled`，就只能靠删 key 或特殊判断，维护很脆。

---

## 12. 运行时接口建议

### 12.1 配置读取接口

```ts
export interface LLMRoleRegistry {
  getRoleConfig(roleId: LLMRoleId): RoleLLMConfig;
  isRoleEnabled(roleId: LLMRoleId): boolean;
}
```

### 12.2 Client 工厂

```ts
export function createLLMClientForRole(
  roleId: LLMRoleId,
  registry: LLMRoleRegistry
): LLMClient;
```

### 12.3 Provider 创建方式

```ts
createActorBrainProvider(createLLMClientForRole('actor_brain', registry));
createCommandGateProvider(createLLMClientForRole('command_gate', registry));
createShowrunnerProvider(createLLMClientForRole('showrunner_director', registry));
createLiveReporterProvider(createLLMClientForRole('live_reporter', registry));
createFinalReporterProvider(createLLMClientForRole('final_reporter', registry));
createRefereeAdvisorProvider(createLLMClientForRole('referee_llm_advisor', registry));
```

重点是：

- provider 自己不再关心全局 `LLMConfig`
- provider 只关心属于自己的 role config

---

## 13. 目录与模块建议

推荐新增或整理为：

```text
src/llm/
  clients/
    byokConfig.ts
    llmClient.ts
    llmRoleRegistry.ts
  roles/
    actorBrainProvider.ts
    commandGateProvider.ts
    showrunnerProvider.ts
    liveReporterProvider.ts
    finalReporterProvider.ts
    refereeAdvisorProvider.ts
  prompts/
    actorBrainPrompt.ts
    commandGatePrompt.ts
    showrunnerPrompt.ts
    liveReporterPrompt.ts
    finalReporterPrompt.ts
    refereeAdvisorPrompt.ts
  types/
    llmRoleTypes.ts
```

现有代码可以平滑迁移，不必一次全推倒。

---

## 14. BYOK UI 设计建议

BYOK 页建议从“一个配置表单”改成“角色卡片列表”。

每张角色卡至少包含：

- 角色名
- 是否启用
- provider
- baseUrl
- model
- apiKey
- timeout
- debugMode
- thinkingEnabled

高级项可折叠：

- temperature
- maxTokens
- topP
- systemPromptOverride

推荐交互：

1. 页面顶部有“复制到全部角色”
2. 每个角色卡有“从某角色复制配置”
3. 支持“共享同一 key，但模型不同”

这样既保留灵活性，也不会把配置页面做得特别折磨。

---

## 15. 日志与调试要求

角色化 BYOK 落地后，LLM debug 日志必须带上 `roleId`。

推荐日志字段：

```ts
interface LLMTraceLog {
  traceId: string;
  roleId: LLMRoleId;
  providerId: string;
  model: string;
  baseUrl: string;
  promptVersion?: string;
  requestMessages: unknown[];
  responseText?: string;
  usage?: unknown;
  error?: string;
  createdAt: number;
}
```

这样你之后 debug 时，才能明确知道：

- 这是演员脑出的错
- 还是记者 prompt 崩了
- 还是导演模型在胡来

---

## 16. 旧配置迁移方案

当前旧格式：

```ts
interface LLMConfig {
  providerId: LLMProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  thinkingEnabled: boolean;
  debugMode: LLMDebugMode;
}
```

迁移方案：

### 第一步：兼容读取

读取本地存储时：

- 如果发现是旧 `LLMConfig`
- 则自动展开成 `LLMRoleConfigMap`

展开规则：

- `actor_brain`
- `command_gate`
- `showrunner_director`
- `live_reporter`
- `final_reporter`

全部先复制旧配置

- `referee_llm_advisor.enabled = false`

### 第二步：写回新格式

一旦用户打开并保存新的 BYOK 页面，统一写回：

- `zog_llm_role_config_map`

旧 key 可保留一版兼容期，再移除。

### 第三步：兼容期结束

等 UI 和 provider 全部改完后，再删除旧单体配置逻辑。

---

## 17. 开发顺序建议

### Phase L1：先冻结类型

先做：

- `LLMRoleId`
- `RoleLLMConfig`
- `LLMRoleConfigMap`
- 迁移器

这个阶段不改业务逻辑，只先冻结配置合同。

### Phase L2：把现有角色接到新 registry

先把以下角色改成按 role 取 config：

- `actor_brain`
- `command_gate`
- `live_reporter`
- `final_reporter`

### Phase L3：导演独立

新增：

- `showrunnerProvider.ts`
- `showrunnerPrompt.ts`
- showrunner runtime 接入点

让导演真正从 `command_gate` 脱离。

### Phase L4：BYOK UI 角色化

把原先单一 BYOK 页改成角色化配置页。

### Phase L5：可选裁判顾问

最后再决定是否启用：

- `referee_llm_advisor`

它应该永远是附加模块，不是底层前提。

---

## 18. 外包时的硬规则

外包 agent 必须遵守以下规则：

1. 不得让 `showrunner_director` 和 `command_gate` 共用同一个 provider 实例槽位。
2. 不得让 `referee_llm_advisor` 直接改真实伤害值。
3. 不得让 Pixi / React 直接依赖 role config 内部结构。
4. 不得继续使用“全局唯一 LLMConfig”作为长期架构。
5. 不得把 reporter 的 live / final 再塞回同一个粗暴流程里。

---

## 19. 最终建议

正式建议如下：

1. V2 采用 `5 个正式 LLM 功能区 + 可选第 6 个裁判顾问` 的架构。
2. `CombatReferee` 继续保留为唯一真实裁判。
3. `showrunner_director` 必须独立出 `command_gate`。
4. `live_reporter` 和 `final_reporter` 必须拆成两个 role slot。
5. `BYOK` 必须从单一 `LLMConfig` 升级为 `LLMRoleConfigMap`。
6. 后续 prompt 调整以“角色槽位”为单位，不再以“全局模型”方式调整。

如果按这个方案推进，后面你就可以非常自然地做到：

- 法官用便宜快模型
- 演员用会演的模型
- 记者用擅长总结的模型
- 导演用擅长节奏和戏剧设计的模型
- 裁判顾问按需开关，不污染硬规则

这才是适合 Zog V2 的长期架构。
