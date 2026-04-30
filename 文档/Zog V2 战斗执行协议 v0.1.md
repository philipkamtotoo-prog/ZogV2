# Zog V2 战斗执行协议 v0.1

> 用途：本协议用于指导 Claude Code / AI 编程助手实现 Zog V2 的首发战斗主循环。  
> 目标：消除“LLM 能不能决定规则”“玩家指令是否直接改数值”“目标到底由谁选”“异常状态如何兜底”等歧义。  
> 原则：LLM 负责表演，代码负责规则。玩家上帝指令是广播 Prompt，不是可枚举字段事件。

---

## 0. 核心结论

Zog V2 的战斗不是普通 AI 群聊，也不是 LLM 自由裁判。

战斗由以下链路执行：

```txt
BattleEngine 选择 activeActor
  ↓
BattleEngine / TargetResolver 计算 lockedTarget
  ↓
BattleEngine / ActionPolicy 生成 allowedActionTypes
  ↓
BattleShowrunner 生成本轮节目局势与导演约束
  ↓
ActorBrain 在硬边界内生成台词、动作、actionType
  ↓
Validator 校验 ActorBrain 输出
  ↓
CombatReferee 根据 actionType 硬编码结算
  ↓
EventLog 记录真实事件
  ↓
DisplayQueue 播放已提交事件
  ↓
WarReporter 包装播报，不改变状态
```

玩家上帝指令链路：

```txt
玩家输入
  ↓
CommandGate 预审
  ↓
生成 directorBroadcast，自然语言广播事实
  ↓
进入 CommandTransaction 队列
  ↓
下一次 beforeNextActorAction 安全点注入 ActorBrain Prompt
  ↓
ActorBrain 必须承认该广播事实
  ↓
CombatReferee 仍然只按 actionType 结算
```

关键边界：

1. 玩家上帝指令不直接改 HP、金币、状态、胜负、渡渡鸟池和演员场景数值。

2. 玩家上帝指令不能被枚举成固定事件表。它是一段经过预审的广播 Prompt。

3. CombatReferee 不读取玩家原话，也不读取 directorBroadcast 做数值结算。

4. ActorBrain 可以根据 directorBroadcast 改变行动表达和 actionType 选择，但 actionType 必须来自 allowedActionTypes。

5. 真实 target 永远由代码决定。ActorBrain 不决定真实 target。

6. WarReporter 只能包装 committed event，不能编造未发生的伤害、死亡、胜利、金币变化。

---

## 1. 模块职责边界

### 1.1 BattleEngine

BattleEngine 是战斗主控。

负责：

- 管理 battle phase。

- 管理 run mode。

- 管理 clock state。

- 推进 Actor Action 计数。

- 选择 activeActor。

- 请求目标选择。

- 请求 action 白名单。

- 调用 LLM 生成。

- 调用 Validator。

- 调用 CombatReferee。

- 写入 EventLog。

- 判断终局。

- 触发结算。

不负责：

- 写演员台词。

- 写记者播报。

- 直接解释玩家自然语言。

### 1.2 BattleShowrunner

BattleShowrunner 是节目导演层。

负责：

- 选择或维持当前 Drama Beat。

- 生成节目局势描述。

- 给 ActorBrain 提供表演约束。

- 解释为什么当前 activeActor 获得镜头。

- 将 directorBroadcast 融入本轮节目语境。

不负责：

- 选择真实 activeActor。

- 选择真实 target。

- 结算伤害。

- 改 HP。

- 改金币。

- 改道具库存。

- 决定胜负。

首发建议：BattleShowrunner 可以先做成代码模板 + 少量 LLM 包装。不要让它自由改规则。

### 1.3 ActorBrain

ActorBrain 是演员脑。

负责：

- 根据人设、当前 Beat、导演约束、硬状态、directorBroadcast 生成表演。

- 从 allowedActionTypes 中选择一个 actionType。

- 生成台词。

- 生成动作描述。

- 生成表演意图。

不负责：

- 决定真实目标。

- 决定真实伤害。

- 决定是否命中。

- 决定状态是否生效。

- 决定胜负。

- 声明自己或他人已经死亡。

- 声明自己造成了多少具体伤害。

- 使用不在 allowedActionTypes 内的 actionType。

### 1.4 CombatReferee

CombatReferee 是唯一战斗裁判。

负责：

- 读取合法 actionType。

- 读取 activeActor。

- 读取 lockedTarget。

- 按代码表结算 HP、状态、渡渡鸟池、演员场景数值和出局。

- 处理护盾、嘲讽、肠胃不适等状态。

- 写出结构化 eventDiff。

不负责：

- 理解演员台词。

- 理解玩家原始输入。

- 理解 directorBroadcast 的自然语言含义。

- 因为演员说“我打爆了他”就额外扣血。

- 因为玩家说“下雨了”就直接写入任何硬状态。

### 1.5 CommandGate

CommandGate 是玩家上帝指令预审器。

负责：

- 判断玩家输入是否能成为节目世界事实。

- 拦截直接胜负、直接死亡、直接改 HP、直接发金币、直接改道具等越权指令。

- 对过强指令进行降级。

- 判断是否缺少目标。

- 输出可注入 ActorBrain Prompt 的 directorBroadcast。

- 输出 UI 反馈文案。

- 输出扣费策略。

不负责：

- 直接改 HP。

- 直接改渡渡鸟池或演员场景数值。

- 直接改状态。

- 直接判胜负。

- 把所有玩家输入枚举成事件类型。

### 1.6 WarReporter

WarReporter 是战地记者。

负责：

- 根据 committedEvents 生成播报。

- 根据 EventLog 生成阶段简报。

- 根据 EventLog 生成最终战报。

- 包装玩家插手记录。

不负责：

- 改状态。

- 改数值。

- 编造未提交事件。

- 判胜负。

---

## 2. 战斗状态模型

### 2.1 BattlePhase

```ts
export type BattlePhase =
  | 'PREPARING'
  | 'RUNNING'
  | 'RESOLVING_COMMAND'
  | 'FINAL_REPORT';
```

含义：

- `PREPARING`：节目准备阶段。

- `RUNNING`：节目运行阶段。

- `RESOLVING_COMMAND`：正在处理玩家指令预审或追问。

- `FINAL_REPORT`：最终战报阶段。

### 2.2 RunMode

```ts
export type RunMode = 'AUTO' | 'MANUAL';
```

- `AUTO`：行动完成后自动推进下一次 Actor Action。

- `MANUAL`：玩家点击一次，推进一次安全点 + 一次 Actor Action。

### 2.3 ClockState

```ts
export type ClockState = 'PLAYING' | 'PAUSED';
```

- `PLAYING`：允许越过安全点继续执行。

- `PAUSED`：停在安全点，不自动生成下一次 Actor Action。

### 2.4 ActorCombatState

```ts
export interface ActorCombatState {
  actorId: string;
  name: string;

  maxHP: number;
  currentHP: number;

  ATK: number;
  DEF: number;
  SPD: number;

  baseThreat: number;
  currentThreat: number;

  isAlive: boolean;
  eliminatedAtActionIndex?: number;

  statuses: ActorStatus[];

  initiative: number;
  spotlightDebt: number;
  lastActedActionIndex?: number;
  lastTargetedActionIndex?: number;
  lastHealedAtActorActionIndex?: number;

  scene: ActorSceneState;
  stats: ActorBattleStats;
}
```

说明：

- `baseThreat` 是开局威胁度，用于赔率计算。

- `currentThreat` 是战中威胁度，用于索敌。

- 如果行动会增加 THREAT，只能改 `currentThreat`。

- `ATK / DEF / SPD / baseThreat` 节目内不变。

### 2.5 ActorSceneState

```ts
export interface ActorSceneState {
  dodosControlled: number;
  dodoTrust: number;
  nestInfluence: number;
}
```

说明：

- `nestInfluence` 表示演员在巢区中的影响力，不是严格占有比例。

- 首发不要使用“食物持有”“鸟群仇恨”“荒岛名声”作为硬状态。

- “荒岛名声”可以由 WarReporter 根据 EventLog 生成标签。

### 2.6 SceneState

```ts
export interface SceneState {
  totalDodos: number;
  wildDodos: number;
}
```

默认值：

```ts
sceneState = {
  totalDodos: 100,
  wildDodos: 100,
};
```

边界：

```txt
totalDodos: 固定 100
wildDodos: 0 - totalDodos
```

首发规则：

- 渡渡鸟数量必须守恒。

- `sum(actor.scene.dodosControlled) + wildDodos` 不得超过 `totalDodos`。

- 如果某个行动需要增加控制鸟，优先从 `wildDodos` 扣除。

- 不允许凭空生成渡渡鸟，除非未来单独设计“节目组投放新鸟”事件。

- 首发不使用旧版全局硬字段；相关节目氛围只作为 `directorBroadcast`、Drama Beat 或播报包装存在，不进入战斗状态。

### 2.7 ActorBattleStats

```ts
export interface ActorBattleStats {
  damageDealt: number;
  damageTaken: number;
  actionsTaken: number;
  dodosGained: number;
  dodosLost: number;
  directorBroadcastReactedCount: number;
}
```

用途：

- MVP 判定。

- 战报生成。

- 阶段简报。

- 玩家回看。

---

## 3. Actor Action 执行单位

### 3.1 定义

一次 Actor Action 是战斗计数单位。

一次 Actor Action 必须满足：

- 只有一个 activeActor。

- 最多一个 lockedTarget。

- 只有一个主 actionType。

- 只进入一次 CombatReferee 结算。

- Actor Action 成功 commit 后，`actorActionIndex += 1`。

### 3.2 不计入 Actor Action 的内容

以下内容不计入 40 次 Actor Action：

- 玩家输入上帝指令。

- CommandGate 预审。

- ASK 追问。

- directorBroadcast 注入。

- WarReporter 播报。

- Zog 吐槽。

- UI 渐显。

- Display Beat。

- 纯展示用信号干扰。

### 3.3 可能不计入 Actor Action 的内容

以下内容首发建议不计入 Actor Action：

- Zog 误触事件。

- 节目组预算不足事故。

如果未来某个事件会替代一次演员行动，必须单独标记：

```ts
countsAsActorAction: boolean;
```

首发默认 `false`。

---

## 4. 安全点协议

### 4.1 安全点定义

安全点是 `beforeNextActorAction`。

只有在安全点可以：

- 注入 ready 状态的 directorBroadcast。

- 消费 CommandTransaction。

- 切换 Beat。

- 选择 activeActor。

- 选择 lockedTarget。

- 生成 allowedActionTypes。

- 调用 ActorBrain。

### 4.2 非安全点禁止事项

在 LLM 正在生成时，不允许：

- 改 activeActor。

- 改 lockedTarget。

- 直接插入新的战斗结算。

- 中断当前 CombatReferee commit。

在文本渐显播放时，不允许：

- 因 UI 播放进度改变战斗状态。

- 因玩家插话打断已提交事件。

### 4.3 玩家输入时机

玩家可以随时输入上帝指令。

但底层处理如下：

- 如果当前正在 LLM 生成：允许输入，CommandTransaction 排队，当前 LLM 生成继续。

- 如果当前正在 DisplayQueue 播放：允许输入，CommandTransaction 排队，当前播放继续。

- 如果当前停在安全点：可以立即预审，但仍然只在下一次 Actor Action 前注入。

---

## 5. activeActor 选择协议

### 5.1 选择权

activeActor 由代码选择，不由 LLM 选择。

BattleShowrunner 不决定真实 activeActor。

### 5.2 候选过滤

候选演员必须满足：

```ts
actor.isAlive === true
actor.currentHP > 0
```

如果演员处于“无法行动”状态，需要根据状态规则决定是否仍然能被选中。

首发规则：

- `STOMACHACHE_NO_ATTACK` 不禁止行动，只禁止攻击类 actionType。

- 如果未来出现 `STUNNED_SKIP_ACTION`，则该演员被选中后执行一次 skip action，并消耗状态。

### 5.3 候选分数

```ts
candidateScore =
  actor.initiative
  + actor.spotlightDebt * 30
  + dangerScore(actor) * 25
  + directorBroadcastPriority(actor) * 40
  + lastBreathPriority(actor) * 100
  - recentActionPenalty(actor)
```

函数：

```ts
function dangerScore(actor) {
  return Math.floor((1 - actor.currentHP / actor.maxHP) * 100);
}

function directorBroadcastPriority(actor) {
  return actor.hasRelevantUnaddressedBroadcast ? 1 : 0;
}

function lastBreathPriority(actor) {
  return actor.currentHP < actor.maxHP * 0.2 ? 1 : 0;
}

function recentActionPenalty(actor, currentActionIndex) {
  if (actor.lastActedActionIndex == null) return 0;
  const gap = currentActionIndex - actor.lastActedActionIndex;
  if (gap <= 0) return 80;
  if (gap === 1) return 50;
  if (gap === 2) return 20;
  return 0;
}
```

### 5.4 分数更新

每次安全点前：

```ts
for each alive actor:
  actor.initiative += actor.SPD * 10
  actor.spotlightDebt += 6
```

选中后：

```ts
activeActor.initiative -= 100
activeActor.spotlightDebt = 0
activeActor.lastActedActionIndex = currentActorActionIndex
```

### 5.5 平分规则

如果多个演员 candidateScore 相同：

1. HP 百分比更低者优先。

2. spotlightDebt 更高者优先。

3. SPD 更高者优先。

4. 使用 `seededRng(battleSeed, actorActionIndex, 'activeActorTieBreak', actorId, null)` 做稳定随机。

禁止使用 Math.random 直接决定，必须使用可复现随机种子。

---

## 6. 目标选择协议

### 6.1 选择权

真实目标由代码选择，不由 ActorBrain 选择。

ActorBrain 输出中的 target 只能作为 `targetEcho`，用于确认它理解了目标。

### 6.2 targetPolicy

每个 actionType 必须声明 targetPolicy。

```ts
export type TargetPolicy =
  | 'TARGET_REQUIRED'
  | 'SELF_ONLY'
  | 'GLOBAL'
  | 'OPTIONAL_TARGET';
```

含义：

- `TARGET_REQUIRED`：必须有一个敌方目标。

- `SELF_ONLY`：只作用于自己。

- `GLOBAL`：作用于全局场景，不需要目标。

- `OPTIONAL_TARGET`：可以带目标，也可以不带目标。

### 6.3 首发 actionType 的 targetPolicy

```ts
const ACTION_TARGET_POLICY = {
  MOCK_ANIMAL_MANAGEMENT: 'TARGET_REQUIRED',
  STEAL_DODOS: 'TARGET_REQUIRED',
  BRIBE_DODOS_WITH_FOOD: 'SELF_ONLY',
  BUILD_FAKE_NEST: 'SELF_ONLY',
  FRAME_TARGET_AS_DODO_ENEMY: 'TARGET_REQUIRED',
  SCARE_HERD: 'TARGET_REQUIRED',
  TRIGGER_STAMPEDE: 'TARGET_REQUIRED',
  CALM_HERD: 'GLOBAL',
  CLAIM_NEST_AREA: 'TARGET_REQUIRED',
  FALLBACK_SIGNAL_STUMBLE: 'GLOBAL',
};
```

### 6.4 TAUNT 强制目标

如果存在任意存活演员拥有 `TAUNT_1_ACTION`，且 activeActor 不是该演员：

```ts
lockedTarget = tauntedActor
```

优先级：

```txt
TAUNT 强制目标 > Beat 聚焦目标 > THREAT 索敌 > 默认目标
```

如果多个演员有 TAUNT：

1. 选择最早获得 TAUNT 的演员。

2. 如果同一时间获得，选择 currentThreat 更高者。

3. 仍然相同，使用 battleSeed 稳定随机。

### 6.5 THREAT 索敌公式

当没有 TAUNT 强制目标时：

```ts
targetScore =
  target.currentThreat * 4
  + lowHpFocus(target)
  + leaderFocus(target)
  + beatFocus(target)
  - recentTargetPenalty(target)
```

函数：

```ts
function lowHpFocus(target) {
  const hpRate = target.currentHP / target.maxHP;
  if (hpRate <= 0.2) return 30;
  if (hpRate <= 0.4) return 15;
  return 0;
}

function leaderFocus(target) {
  if (computeCurrentRankByFinalScore(target) === 1) return 20;
  if (target.scene.dodosControlled >= 20) return 10;
  return 0;
}

function beatFocus(target) {
  if (currentBeat.focusActorId === target.actorId) return 25;
  return 0;
}

function recentTargetPenalty(target, currentActionIndex) {
  if (target.lastTargetedActionIndex == null) return 0;
  const gap = currentActionIndex - target.lastTargetedActionIndex;
  if (gap <= 1) return 25;
  if (gap === 2) return 10;
  return 0;
}
```

### 6.6 目标候选过滤

目标候选必须满足：

```ts
target.actorId !== activeActor.actorId
target.isAlive === true
target.currentHP > 0
```

如果没有合法目标：

- 所有 `TARGET_REQUIRED` actionType 从 allowedActionTypes 中移除。

- ActorBrain 只能选择 SELF_ONLY 或 GLOBAL action。

- 如果战场只剩 activeActor 一人，BattleEngine 应立即触发终局，不再生成行动。

### 6.7 Prompt 注入目标方式

当行动可能需要目标时，ActorBrain Prompt 必须包含：

```txt
[SYSTEM RULE]
本轮真实目标已由节目系统锁定。
你不能更换目标。
lockedTargetId: <id>
lockedTargetName: <name>
你可以在台词中嘲讽、欺骗、攻击或利用该目标，但不得把主要行动对象改成其他演员。
```

当 actionType 是 SELF_ONLY 或 GLOBAL 时，不要强行写“必须攻击某目标”。

---

## 7. actionType 白名单协议

### 7.1 选择权

ActorBrain 可以选择 actionType，但只能从 allowedActionTypes 中选。

allowedActionTypes 由代码生成。

### 7.2 生成依据

allowedActionTypes 根据以下条件生成：

- activeActor 是否存活。

- 是否存在合法目标。

- activeActor 当前状态。

- 当前资源是否足够。

- 当前 Beat 是否限制行动。

- 当前 directorBroadcast 是否要求回应，但不直接生成数值事件。

- 是否处于濒死状态。

### 7.3 资源条件

```txt
BRIBE_DODOS_WITH_FOOD:
  不读取全局食物硬字段
  食物只作为节目包装，由 ActorBrain 在台词和动作中表现

STEAL_DODOS:
  需要目标有 dodosControlled > 0 或 wildDodos > 0

CLAIM_NEST_AREA:
  目标 nestInfluence 可为 0，仍可执行，但目标减少部分 clamp 到 0

CALM_HERD:
  始终可允许，作为无伤的稳场、安抚、争取鸟群信任行动
```

### 7.4 状态限制

如果 activeActor 有 `STOMACHACHE_NO_ATTACK`：

- 禁止所有 damageEnabled=true 的 actionType。

- 允许 BRIBE_DODOS_WITH_FOOD、BUILD_FAKE_NEST、CALM_HERD。

- 行动结束后移除该状态。

如果 activeActor 未来有 `STUNNED_SKIP_ACTION`：

- 不调用 ActorBrain。

- 直接提交 `SKIP_ACTION_STUNNED`。

- 消耗状态。

### 7.5 兜底 action

如果 allowedActionTypes 为空：

强制加入：

```ts
FALLBACK_SIGNAL_STUMBLE
```

效果：

- 不造成伤害。

- 不改变 HP。

- 可轻微改变节目包装。

- 不直接改变任何硬状态。

### 7.6 ActionDef 实现表

首发建议把行动定义写成一张代码表，BattleEngine、Validator、CombatReferee 共用，避免 Prompt、校验和结算各写一套。

```ts
export type ActionType =
  | 'MOCK_ANIMAL_MANAGEMENT'
  | 'STEAL_DODOS'
  | 'BRIBE_DODOS_WITH_FOOD'
  | 'BUILD_FAKE_NEST'
  | 'FRAME_TARGET_AS_DODO_ENEMY'
  | 'SCARE_HERD'
  | 'TRIGGER_STAMPEDE'
  | 'CALM_HERD'
  | 'CLAIM_NEST_AREA'
  | 'FALLBACK_SIGNAL_STUMBLE';

export type ActionTag =
  | 'DAMAGE'
  | 'DODO_GAIN'
  | 'DODO_STEAL'
  | 'TRUST_GAIN'
  | 'TRUST_LOSS'
  | 'NEST_GAIN'
  | 'NEST_STEAL'
  | 'THREAT_UP'
  | 'SAFE_FALLBACK';

export interface ActionDef {
  actionType: ActionType;
  targetPolicy: TargetPolicy;
  damageEnabled: boolean;
  actionPower: number;
  tags: ActionTag[];
}

export const ACTION_DEFS: Record<ActionType, ActionDef> = {
  MOCK_ANIMAL_MANAGEMENT: {
    actionType: 'MOCK_ANIMAL_MANAGEMENT',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 0.8,
    tags: ['DAMAGE', 'THREAT_UP'],
  },
  STEAL_DODOS: {
    actionType: 'STEAL_DODOS',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 0.8,
    tags: ['DAMAGE', 'DODO_STEAL'],
  },
  BRIBE_DODOS_WITH_FOOD: {
    actionType: 'BRIBE_DODOS_WITH_FOOD',
    targetPolicy: 'SELF_ONLY',
    damageEnabled: false,
    actionPower: 0,
    tags: ['DODO_GAIN', 'TRUST_GAIN'],
  },
  BUILD_FAKE_NEST: {
    actionType: 'BUILD_FAKE_NEST',
    targetPolicy: 'SELF_ONLY',
    damageEnabled: false,
    actionPower: 0,
    tags: ['NEST_GAIN'],
  },
  FRAME_TARGET_AS_DODO_ENEMY: {
    actionType: 'FRAME_TARGET_AS_DODO_ENEMY',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 1.0,
    tags: ['DAMAGE', 'TRUST_LOSS', 'THREAT_UP'],
  },
  SCARE_HERD: {
    actionType: 'SCARE_HERD',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 1.1,
    tags: ['DAMAGE', 'TRUST_LOSS'],
  },
  TRIGGER_STAMPEDE: {
    actionType: 'TRIGGER_STAMPEDE',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 1.3,
    tags: ['DAMAGE', 'THREAT_UP'],
  },
  CALM_HERD: {
    actionType: 'CALM_HERD',
    targetPolicy: 'GLOBAL',
    damageEnabled: false,
    actionPower: 0,
    tags: ['TRUST_GAIN'],
  },
  CLAIM_NEST_AREA: {
    actionType: 'CLAIM_NEST_AREA',
    targetPolicy: 'TARGET_REQUIRED',
    damageEnabled: true,
    actionPower: 0.7,
    tags: ['DAMAGE', 'NEST_GAIN', 'NEST_STEAL'],
  },
  FALLBACK_SIGNAL_STUMBLE: {
    actionType: 'FALLBACK_SIGNAL_STUMBLE',
    targetPolicy: 'GLOBAL',
    damageEnabled: false,
    actionPower: 0,
    tags: ['SAFE_FALLBACK'],
  },
};
```

---

## 8. 首发 actionType 结算表

### 8.1 通用伤害公式

只有 `damageEnabled=true` 的行动才调用伤害公式。

```ts
damage = clamp(
  Math.round(
    Math.max(0, attacker.ATK * actionPower - defender.DEF)
    * randomRange(0.85, 1.15, battleSeed, actorActionIndex, actionType, attacker.actorId, defender.actorId)
  ),
  1,
  35
)
```

所有战斗随机必须使用可复现随机源，禁止直接调用 `Math.random`。

```ts
seededRng(battleSeed, actorActionIndex, namespace, actorId, targetId)
```

无伤行动：

```ts
damage = 0
```

禁止对 actionPower=0 的行动调用通用伤害公式。

### 8.2 MOCK_ANIMAL_MANAGEMENT

```txt
目标策略：TARGET_REQUIRED
伤害：是
actionPower：0.8
效果：
  对 lockedTarget 造成伤害
  lockedTarget.currentThreat += 2
```

### 8.3 STEAL_DODOS

```txt
目标策略：TARGET_REQUIRED
伤害：是
actionPower：0.8
效果：
  对 lockedTarget 造成伤害
  从目标处偷最多 5 只渡渡鸟
  如果目标不足 5，最多从 wildDodos 补 2 只
```

结算：

```ts
const stolenFromTarget = Math.min(target.scene.dodosControlled, 5);
const needed = 5 - stolenFromTarget;
const takenFromWild = Math.min(scene.wildDodos, needed, 2);

 target.scene.dodosControlled -= stolenFromTarget;
 actor.scene.dodosControlled += stolenFromTarget + takenFromWild;
 scene.wildDodos -= takenFromWild;
```

注意：不能先给 actor +5 再判断，否则会重复加鸟。

### 8.4 BRIBE_DODOS_WITH_FOOD

```txt
目标策略：SELF_ONLY
伤害：否
效果：
  从 wildDodos 中吸引最多 8 只
  actor.dodosControlled += 实际吸引数量
  actor.dodoTrust += 6
```

结算：

```ts
const gained = Math.min(scene.wildDodos, 8);
scene.wildDodos -= gained;
actor.scene.dodosControlled += gained;
actor.scene.dodoTrust += 6;
```

### 8.5 BUILD_FAKE_NEST

```txt
目标策略：SELF_ONLY
伤害：否
效果：
  actor.nestInfluence += 10
```

### 8.6 FRAME_TARGET_AS_DODO_ENEMY

```txt
目标策略：TARGET_REQUIRED
伤害：是
actionPower：1.0
效果：
  对 lockedTarget 造成伤害
  lockedTarget.dodoTrust -= 6
  lockedTarget.currentThreat += 4
```

### 8.7 SCARE_HERD

```txt
目标策略：TARGET_REQUIRED
伤害：是
actionPower：1.1
效果：
  对 lockedTarget 造成伤害
  lockedTarget.dodoTrust -= 2
```

### 8.8 TRIGGER_STAMPEDE

```txt
目标策略：TARGET_REQUIRED
伤害：是
actionPower：1.3
效果：
  对 lockedTarget 造成较高伤害
  activeActor.currentThreat += 5
```

### 8.9 CALM_HERD

```txt
目标策略：GLOBAL
伤害：否
效果：
  activeActor.scene.dodoTrust += 5
```

### 8.10 CLAIM_NEST_AREA

```txt
目标策略：TARGET_REQUIRED
伤害：是
actionPower：0.7
效果：
  对 lockedTarget 造成伤害
  activeActor.scene.nestInfluence += 8
  lockedTarget.nestInfluence -= 5，最低为 0
```

---

## 9. 状态协议

### 9.1 ActorStatus

```ts
export type ActorStatusType =
  | 'SHIELD_ONCE'
  | 'TAUNT_1_ACTION'
  | 'STOMACHACHE_NO_ATTACK';

export interface ActorStatus {
  type: ActorStatusType;
  source?: string;
  createdAtActionIndex: number;
  expiresAtActionIndex?: number;
  consumed?: boolean;
}
```

### 9.2 SHIELD_ONCE

效果：

- 抵挡下一次实际伤害。

- 只抵挡 damage > 0 的伤害。

- 不抵挡 THREAT 增加。

- 不抵挡 dodoTrust 变化。

- 抵挡后移除。

结算：

```ts
if (target has SHIELD_ONCE && damage > 0) {
  damage = 0;
  remove SHIELD_ONCE;
  eventTags.add('SHIELD_BLOCKED_DAMAGE');
}
```

### 9.3 TAUNT_1_ACTION

效果：

- 下一次其他演员需要选择攻击/目标型行动时，优先把目标锁定为该演员。

- 被锁定一次后移除。

- 如果下一次行动是 SELF_ONLY 或 GLOBAL，不消耗 TAUNT。

- 如果持有 TAUNT 的演员已出局，移除 TAUNT。

### 9.4 STOMACHACHE_NO_ATTACK

来源：劣质机油 20% 概率。

效果：

- 该演员下一次行动不能选择 damageEnabled=true 的 actionType。

- 该演员仍可选择无伤行动。

- 该演员完成一次行动后移除状态。

### 9.5 状态清理时机

每次安全点前执行：

```txt
1. 移除 consumed 状态。
2. 移除持有者已出局的状态。
3. 移除过期状态。
```

每次 commit 后执行：

```txt
1. 标记本次被消耗的状态。
2. clamp 所有字段。
3. 检查出局。
```

---

## 10. 玩家上帝指令协议

### 10.1 设计定义

玩家上帝指令是开放式自然语言输入。

它不是枚举事件。

它不是数值技能。

它不是直接改状态的控制台命令。

它是经过 CommandGate 预审后，注入下一轮 ActorBrain Prompt 的导演广播事实。

### 10.2 CommandGate 输出

```ts
export type CommandGateResult = 'ALLOW' | 'ASK' | 'DOWNGRADE' | 'REJECT';

export interface CommandGateOutput {
  result: CommandGateResult;
  rawInput: string;
  normalizedInput: string;

  directorBroadcast?: DirectorBroadcast;

  targetActorIds?: string[];
  targetQuestion?: string;
  targetOptions?: CommandTargetOption[];

  lifetime: 'NEXT_ACTION' | 'CURRENT_BEAT';
  strength: 'LIGHT' | 'NORMAL' | 'OVERPOWERED_DOWNGRADED';

  feePolicy: CommandFeePolicy;
  uiFeedback: string;
  rejectReason?: string;
}
```

### 10.3 directorBroadcast

`directorBroadcast` 是自然语言广播事实，不是枚举事件。

```ts
export interface DirectorBroadcast {
  broadcastId: string;
  text: string;
  scope: 'GLOBAL' | 'TARGETED';
  targetActorIds: string[];
  lifetime: 'NEXT_ACTION' | 'CURRENT_BEAT';
  expiresAtActionIndex: number;
  reactedActorIds: string[];
  sourceTransactionId: string;
}
```

它应该表达：

- 发生了什么节目事实。

- 谁必须承认这件事。

- 这件事如何影响下一轮表演。

- 不能包含直接数值结算结果。

Prompt 拼接规则：

- 每次调用 ActorBrain 时，所有待生效 `directorBroadcast.text` 必须作为业务提示词第一段拼接。

- 位置在硬性系统规则之后、演员人设和战场摘要之前。

- 标题固定为 `[DIRECTOR BROADCAST / MUST ACKNOWLEDGE]`。

- ActorBrain 必须在本轮台词、动作或 actionType 选择中承认广播事实。

- `CombatReferee` 不读取 `directorBroadcast.text` 做数值结算。

允许：

```txt
荒岛上突然开始下雨。下一位行动演员必须承认这场雨已经发生，并让自己的行动、台词或判断受到影响。其他演员可以在后续反应中利用、抱怨或误解这场雨。
```

不允许：

```txt
直接修改任意硬状态，例如 currentHP、wildDodos、dodoTrust。
```

不允许：

```txt
TDog 受到 20 点伤害。
```

不允许：

```txt
Cybercat 直接死亡。
```

### 10.4 ALLOW

适用：

- 玩家输入可以成为节目事实。

- 不直接决定胜负。

- 不直接改数值。

- 不直接杀死演员。

- 不直接发金币或道具。

示例：

玩家输入：

```txt
下雨了
```

输出：

```ts
{
  result: 'ALLOW',
  directorBroadcast: {
    broadcastId: '<generated-id>',
    text: '荒岛上突然开始下雨。下一位行动演员必须承认这场雨已经发生，并让自己的行动、台词或判断受到影响。其他演员可以在后续反应中利用、抱怨或误解这场雨。',
    scope: 'GLOBAL',
    targetActorIds: [],
    lifetime: 'CURRENT_BEAT',
    expiresAtActionIndex: currentActorActionIndex + 3,
    reactedActorIds: [],
    sourceTransactionId: '<transaction-id>',
  },
  lifetime: 'CURRENT_BEAT',
  strength: 'NORMAL'
}
```

### 10.5 ASK

适用：

- 指令本身可以成立。

- 但缺少目标就无法注入。

只允许追问目标。

不追问：

- 持续时间。

- 强度。

- 细节。

- 二次自由文本。

示例：

玩家输入：

```txt
让他闭嘴
```

输出：

```ts
{
  result: 'ASK',
  targetQuestion: '你想让谁闭嘴？',
  targetOptions: 当前存活演员 + 当前镜头演员,
  feePolicy: { chargeNow: false }
}
```

玩家选择目标后，生成：

```txt
导播信号强行压过了 TDog 的麦克风。TDog 下一次被镜头提及时必须回应自己被要求闭嘴这件事，其他演员可以借机嘲笑、打断或利用他的尴尬。
```

### 10.6 DOWNGRADE

适用：

- 玩家输入方向可以进入节目。

- 但强度过高，直接执行会破坏规则。

示例：

玩家输入：

```txt
把 TDog 一拳打死
```

不能直接死亡。

可以降级为：

```txt
一只看不见的导播拳头从屏幕外砸向 TDog，但电视信号太差，只把他的麦克风打歪了。TDog 必须回应这次离谱羞辱，其他演员可以借机嘲笑或攻击他。
```

注意：

- DOWNGRADE 后仍然不直接扣 HP。

- DOWNGRADE 后仍然只影响下一轮 ActorBrain 表演和 actionType 选择。

### 10.7 REJECT

适用：

- 直接决定胜负。

- 直接杀死演员。

- 直接改 HP。

- 直接改 ATK / DEF / SPD。

- 直接给金币。

- 直接刷道具。

- 直接修改系统设置。

- 与节目世界完全无关且无法包装。

示例：

```txt
TDog 死了
```

输出：

```ts
{
  result: 'REJECT',
  rejectReason: '玩家不能直接决定演员死亡。',
  uiFeedback: '节目组拒绝了这条导播信号：你不能直接决定演员死亡。'
}
```

### 10.8 计费协议

首发规则：

- 上帝指令入口免费。

- 文本按字收费。

- @质问是免费功能入口，不额外收道具费；输入文字仍按上帝指令字数计费。

- ASK 阶段不扣费。

- 玩家点按钮选择目标不计入字数。

- ALLOW 扣全额。

- DOWNGRADE 扣全额，但 UI 必须明确提示已降级。

- REJECT：每场节目首次 REJECT 免费；同场后续 REJECT 扣 30% 手续费。

- 如果指令排队但节目结束前未注入，全额退款。

字数计算：

```txt
中文汉字：每字 1
英文连续串：按 1
数字连续串：按 1
标点：不计
空格：不计
emoji：按 1
@按钮选择角色：不计
```

费用：

```ts
cost = countedChars * 20
```

### 10.9 余额处理

提交时冻结预计费用。

```txt
ALLOW：扣除冻结费用。
DOWNGRADE：扣除冻结费用。
ASK：继续冻结，直到玩家选择目标；取消则解冻。
REJECT 免费场次：解冻。
REJECT 非免费场次：扣 30%，解冻 70%。
系统失败：全额解冻。
节目结束未注入：全额解冻。
```

### 10.10 多条指令排队

规则：

- FIFO。

- 每个 Actor Action 前最多注入 1 条 directorBroadcast。

- 多余指令继续排队。

- 如果玩家连续输入多条，UI 显示队列数量。

### 10.11 目标失效

如果 directorBroadcast 目标演员在注入前已出局：

- 若可降级为无目标广播，则 DOWNGRADE 注入。

- 若必须目标存在，则取消并退款。

示例：

玩家输入：

```txt
让 TDog 闭嘴
```

但 TDog 注入前出局。

处理：

```txt
取消该指令，全额退款。UI：导播信号慢了一拍，TDog 已经退出画面。
```

---

## 11. CommandTransaction 状态机

### 11.1 状态定义

```ts
export type CommandTransactionStatus =
  | 'QUEUED'
  | 'JUDGING'
  | 'WAITING_CLARIFICATION'
  | 'READY_TO_INJECT'
  | 'INJECTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'SYSTEM_FAILED_REFUND';
```

### 11.2 流转

```txt
玩家提交
  ↓
QUEUED
  ↓
JUDGING
  ↓
ALLOW → READY_TO_INJECT
ASK → WAITING_CLARIFICATION → READY_TO_INJECT / CANCELLED
DOWNGRADE → READY_TO_INJECT
REJECT → REJECTED
模型失败 / 解析失败 → SYSTEM_FAILED_REFUND
```

### 11.3 注入后

注入成功：

```txt
READY_TO_INJECT → INJECTED
```

注入成功不等于产生数值变化。

只有后续 Actor Action commit 后，才可能产生真实战斗变化。

---

## 12. ActorBrain 输出协议

### 12.1 输出结构

```ts
export interface ActorBrainOutput {
  actorId: string;
  targetEcho?: string | null;
  actionType: ActionType;
  line: string;
  actionDescription: string;
  performanceIntent: string;
}
```

### 12.2 字段规则

`actorId`：

- 必须等于 activeActorId。

`targetEcho`：

- 如果 targetPolicy 是 TARGET_REQUIRED，必须等于 lockedTargetId。

- 如果 targetPolicy 是 SELF_ONLY 或 GLOBAL，可以为 null。

- targetEcho 不参与真实目标选择。

`actionType`：

- 必须属于 allowedActionTypes。

`line`：

- 演员台词。

- 不能声明具体伤害数字。

- 不能声明胜利。

- 不能声明目标已经死亡。

`actionDescription`：

- 行动描述。

- 必须和 actionType 大致一致。

`performanceIntent`：

- 表演意图。

- 只给 WarReporter 和回看使用。

- CombatReferee 不读取该字段。

### 12.3 Prompt 必须包含的硬约束

每次调用 ActorBrain 时，Prompt 必须包含：

```txt
你是演员脑，不是裁判。
你不能决定伤害数字。
你不能决定胜负。
你不能决定任何演员死亡。
你不能改变真实目标。
你只能从 allowedActionTypes 中选择一个 actionType。
如果存在 directorBroadcast，你必须在本轮台词、动作或行动选择中承认它。
```

---

## 13. Validator 协议

### 13.1 校验时机

ActorBrain 输出后，进入 CombatReferee 前，必须经过 Validator。

### 13.2 校验规则

必须全部通过：

```ts
output.actorId === activeActor.actorId
output.actionType in allowedActionTypes
output.targetEcho matches lockedTarget when required
activeActor.isAlive === true
lockedTarget.isAlive === true when required
stateVersion still valid
```

### 13.3 文本违规处理

如果 line 或 actionDescription 声称：

- 具体伤害数字。

- 某人死亡。

- 某人已经胜利。

- 改变金币。

- 改变道具。

处理：

1. 不直接失败。

2. CombatReferee 忽略这些声明。

3. Display 层可以替换或淡化违规句。

4. 如果严重破坏显示，触发一次 repair。

### 13.4 修复策略

如果结构错误：

1. 尝试 repair once。

2. repair 仍失败，则使用 fallback action。

fallback：

```ts
{
  actorId: activeActorId,
  targetEcho: lockedTargetId ?? null,
  actionType: bestSafeFallbackAction,
  line: '<演员被电视雪花噎住，只能狼狈地做出一个保守动作。>',
  actionDescription: '<信号干扰导致动作变形。>',
  performanceIntent: 'fallback_due_to_invalid_llm_output'
}
```

---

## 14. CombatReferee commit 协议

### 14.1 commit 输入

```ts
export interface CommitInput {
  battleId: string;
  stateVersion: number;
  actorActionIndex: number;
  activeActorId: string;
  lockedTargetId?: string | null;
  actionType: ActionType;
  actorBrainOutput: ActorBrainOutput;
}
```

### 14.2 commit 输出

```ts
export interface CommitResult {
  newStateVersion: number;
  event: BattleEvent;
  actorDiffs: ActorDiff[];
  sceneDiff: SceneDiff;
  statusDiffs: StatusDiff[];
  eliminatedActorIds: string[];
  shouldCheckEnd: boolean;
}
```

### 14.3 commit 顺序

```txt
1. 校验 stateVersion。
2. 校验 activeActor 存活。
3. 校验 actionType 合法。
4. 校验 target 合法。
5. 处理 action 前状态限制。
6. 计算伤害或无伤效果。
7. 处理 SHIELD_ONCE。
8. 应用 HP diff。
9. 应用渡渡鸟池和演员场景 diff。
10. 应用 THREAT diff。
11. clamp 全部字段。
12. 检查出局。
13. 消耗状态。
14. 更新 battleStats。
15. 写入 BattleEvent。
16. actorActionIndex += 1。
17. stateVersion += 1。
18. 检查终局。
```

### 14.4 clamp 规则

```ts
currentHP = clamp(currentHP, 0, maxHP)
currentThreat = clamp(currentThreat, 0, 99)
dodoTrust = clamp(dodoTrust, 0, 100)
nestInfluence = clamp(nestInfluence, 0, 100)
dodosControlled = clamp(dodosControlled, 0, totalDodos)
wildDodos = clamp(wildDodos, 0, totalDodos)
```

commit 后必须检查渡渡鸟守恒：

```ts
const controlled = sum(aliveAndEliminatedActors.map(a => a.scene.dodosControlled));
assert(controlled + scene.wildDodos <= scene.totalDodos);
```

如果超出，优先修正 wildDodos 到合法值，并记录 error tag。

---

## 15. 道具协议

### 15.1 购买与使用次数

首发规则：

- 道具必须在战斗前购买。

- 道具购买后进入玩家库存。

- 战斗中只能使用库存中已有的道具。

- 战斗中不能临时购买道具。

- 冰箱等级决定每局比赛的道具使用次数上限。

- 不做战前携带 UI，不做“携带但未使用”的额外判断。

- 每次成功使用道具时，消耗 1 个库存道具，并消耗 1 次本局道具使用次数。

### 15.2 使用时机

玩家可以在安全点或 Display 播放期间选择使用道具。

但道具效果只在安全点结算。

如果当前正在 LLM 生成：

- 不打断当前生成。

- 道具使用请求排队到下一安全点。

### 15.3 使用目标

首发建议：

- 救场类道具只能用于玩家下注支持的演员。

- 如果没有下注支持对象，则不能使用救场道具。

如果要允许任意目标使用，必须修改 UI 和沉没成本逻辑。

### 15.4 劣质机油

```txt
价格：80G
效果：目标恢复 20 HP
副作用：20% 概率获得 STOMACHACHE_NO_ATTACK
```

### 15.5 急救罐头

```txt
价格：150G
效果：目标恢复 35 HP
副作用：无
```

### 15.6 高能嘲讽电池

```txt
价格：350G
效果：目标恢复 60 HP，获得 SHIELD_ONCE，获得 TAUNT_1_ACTION
副作用：下一次其他演员目标选择时，优先指向目标
```

### 15.7 回血限制

同一名演员在自己两次行动之间最多被回血一次。

实现：

```ts
if (target.lastHealedAtActorActionIndex != null) {
  const targetHasActedSinceHeal = target.lastActedActionIndex != null
    && target.lastActedActionIndex > target.lastHealedAtActorActionIndex;

  if (!targetHasActedSinceHeal) rejectUseItem();
}
```

回血不能超过 maxHP。

---

## 16. Drama Beat 协议

### 16.1 Beat 定义

Drama Beat 是节目压力源，不是完整剧情脚本。

Beat 可以影响：

- Prompt 语气。

- 镜头理由。

- allowedActionTypes 倾向。

- targetScore 加权。

Beat 首发默认不直接改数值。

如果某个 Beat 要直接改数值，必须写成明确的 `BeatEventEffect`，不能交给 LLM 自由发挥。

### 16.2 Beat 结构

```ts
export interface DramaBeat {
  beatId: string;
  name: string;
  description: string;
  remainingActions: number;
  focusActorId?: string;
  preferredActionTags?: ActionTag[];
  targetBiasActorId?: string;
  promptConstraint: string;
  directNumericEffect?: BeatEventEffect;
}
```

### 16.3 Beat 持续

一个 Beat 默认持续 2 - 3 次 Actor Action。

不要每轮都换 Beat。

换 Beat 条件：

- remainingActions <= 0。

- 玩家 directorBroadcast 强烈改变节目事实。

- 有演员出局。

- 战斗进入濒死阶段。

- 场面连续 2 次无伤且过于和平。

### 16.4 Beat 不得越权

Beat 不得直接说：

```txt
让 TDog 扣 30 HP。
让 Cybercat 必胜。
让某演员出局。
```

可以说：

```txt
领先者被节目组重点羞辱。当前镜头应该让其他演员更容易攻击或嘲讽领先者。
```

然后代码可以通过 `beatFocus` 增加 targetScore。

---

## 17. DisplayQueue 协议

### 17.1 DisplayQueue 输入

DisplayQueue 只能消费 committed BattleEvent。

禁止直接播放未提交的 ActorBrain 草稿作为真实结果。

### 17.2 Display Beat 内容

一次 Display Beat 可以包含：

- activeActor 台词。

- activeActor 动作描述。

- target 反应短句。

- WarReporter 播报。

- Zog 吐槽。

- UI 数值变化。

但真实状态已经在 commit 时改变，不等 Display 播完才改变。

### 17.3 UI 显示原则

如果 ActorBrain 台词与结算冲突：

- UI 数值以 CombatReferee 为准。

- Reporter 播报以 committed event 为准。

- 可以保留演员吹牛台词，但不要让玩家误以为那是真实结算。

示例：

演员说：

```txt
我这一脚直接把你送走！
```

但实际只造成 6 点伤害。

Reporter 可以播：

```txt
他声称自己完成了史诗级攻击，但计分板只承认了 6 点伤害。
```

---

## 18. EventLog 协议

### 18.1 BattleEvent

```ts
export interface BattleEvent {
  eventId: string;
  actorActionIndex: number;
  type: BattleEventType;
  activeActorId?: string;
  targetActorId?: string;
  actionType?: ActionType;
  line?: string;
  actionDescription?: string;
  directorBroadcastId?: string;
  diffs: BattleDiff[];
  tags: BattleEventTag[];
  createdAt: number;
}
```

### 18.2 Event tags

首发建议标签：

```ts
export type BattleEventTag =
  | 'DAMAGE_DEALT'
  | 'NO_DAMAGE_ACTION'
  | 'DODO_GAINED'
  | 'DODO_STOLEN'
  | 'THREAT_UP'
  | 'SHIELD_BLOCKED_DAMAGE'
  | 'ACTOR_ELIMINATED'
  | 'PLAYER_BROADCAST_REACTED'
  | 'NEAR_DEATH'
  | 'FALLBACK_USED'
  | 'INVALID_LLM_REPAIRED';
```

用途：

- 战报。

- 回看。

- 记者播报。

- 调试。

---

## 19. 终局与排名协议

### 19.1 终局条件

满足任一条件即结束：

1. 只剩 1 名演员存活。

2. 达到 40 次 Actor Action。

3. 全员失败。

### 19.2 存活胜利

如果只剩 1 名演员存活：

- 该演员为胜者。

- 立即进入结算。

### 19.3 40 次上限

如果达到 40 次 Actor Action 且仍有多人存活：

计算 FinalScore：

```ts
finalScore = Math.floor(currentHP)
  + Math.floor(dodosControlled * 2)
  + Math.floor(dodoTrust)
  + Math.floor(nestInfluence * 1.5);
```

FinalScore 最高者胜出。

### 19.4 FinalScore 平局

平局时按以下顺序：

1. currentHP 更高。

2. dodosControlled 更高。

3. dodoTrust 更高。

4. nestInfluence 更高。

5. preBattlePower 更高。

6. battleSeed 稳定随机。

### 19.5 已出局排名

已出局演员按出局顺序倒序排名。

越晚出局，排名越高。

如果同一次 action 多人出局：

1. 出局前 currentHP 更高者排名更高。

2. 出局后 FinalScore 更高者排名更高。

3. battleSeed 稳定随机。

### 19.6 全员失败

如果全员失败：

- 无胜者。

- 玩家下注失败。

- 片酬按失败排名发放，或首发统一只发安慰片酬。

- WarReporter 生成“节目事故导致全员失败”战报。

首发建议：

```txt
全员失败时无第 1 名。
片酬：所有演员 10S，MVP 仍额外 +25S。
```

### 19.7 MVP

MVP 首发定义：

```txt
damageDealt 最高的演员。
```

如果并列：

1. 排名更高者。

2. actionsTaken 更少者。

3. battleSeed 稳定随机。

注意：

- MVP 实际更接近“伤害王”。

- 如果 UI 文案叫“本期最佳演员”，可能和渡渡鸟控制胜利目标冲突。

- 首发建议 UI 写“本期破坏王”。

---

## 20. 异常与兜底协议

### 20.1 LLM 超时

超时时间：20 秒。

处理：

1. 取消该 generation。

2. 记录 `LLM_TIMEOUT`。

3. 使用 fallback action。

4. 不让战斗卡死。

### 20.2 LLM 输出非法 JSON

处理：

1. repair once。

2. repair 失败，使用 fallback action。

3. 记录 `INVALID_LLM_REPAIRED` 或 `FALLBACK_USED`。

### 20.3 输出 actionType 不在白名单

处理：

1. repair once，要求从 allowedActionTypes 重选。

2. 失败则 fallback。

### 20.4 输出目标不匹配

如果 targetEcho 不等于 lockedTargetId：

1. repair once。

2. 失败则用 lockedTargetId 覆盖 targetEcho。

3. 如果台词严重指向其他目标，使用 fallback 文案。

真实目标永远不变。

### 20.5 生成时目标存活，提交时目标出局

每次 generation 带 `stateVersionAtStart`。

提交前检查：

```ts
if (currentStateVersion !== stateVersionAtStart) {
  revalidate target and action;
}
```

如果目标已出局：

- 放弃本次输出。

- 回到安全点重新选择 activeActor / target。

- 不计 Actor Action。

### 20.6 生成时 activeActor 出局

如果 activeActor 在提交前已出局：

- 丢弃本次输出。

- 不计 Actor Action。

- 回到安全点。

### 20.7 Display 播放失败

Display 失败不回滚战斗状态。

处理：

- 跳过该展示片段。

- 保留 EventLog。

- UI 可显示简短占位：“信号丢失，但计分板已经更新。”

### 20.8 CommandGate 失败

如果 CommandGate LLM 失败或解析失败：

- 不注入。

- 全额退款。

- transaction → SYSTEM_FAILED_REFUND。

- UI：节目组没听清这条信号，金币已退回。

### 20.9 金币不足

提交上帝指令前先检查余额是否足够冻结预计费用。

不足：

- 不创建有效 transaction。

- UI 提示余额不足。

### 20.10 队列过长

首发建议 CommandTransaction 最多排队 3 条。

超过：

- 拒绝新输入。

- UI：导播台信号堵塞，请等前面的指令播出。

---

## 21. Claude Code 实现优先级

### 21.1 P0 必须实现

- BattleState 基础字段。

- activeActor 选择。

- target 选择。

- allowedActionTypes 生成。

- ActorBrain 输出 schema。

- Validator。

- CombatReferee 结算表。

- EventLog。

- CommandGate 基础 ALLOW / ASK / DOWNGRADE / REJECT。

- directorBroadcast 注入 Prompt。

- 上帝指令不直接改数值。

- 道具基础使用。

- BYOK 模型配置接入 ActorBrain 调用。

- 终局判断。

- FinalScore 排名。

### 21.2 P1 建议实现

- Drama Beat remainingActions。

- WarReporter 单轮播报。

- Zog 吐槽。

- LLM repair once。

- fallback action。

- 事件 tags。

- 回看用 battleEventLog。

### 21.3 P2 后置

- Beat 直接数值效果。

- 高级 Zog 误触事件池。

- 永久 Prompt 注入。

- 通信终端。

- 复杂战报小报排版。

---

## 22. 禁止实现清单

首发不要实现以下内容：

1. 不要让玩家上帝指令直接改 HP。

2. 不要让玩家上帝指令直接改渡渡鸟池、演员场景数值或任何硬状态。

3. 不要把玩家输入枚举成固定事件类型。

4. 不要让 CombatReferee 解析自然语言。

5. 不要让 ActorBrain 决定真实 target。

6. 不要让 BattleShowrunner 决定真实 activeActor。

7. 不要让 WarReporter 编造未提交事件。

8. 不要让 DisplayQueue 改战斗状态。

9. 不要让 LLM 输出绕过 Validator。

10. 不要在战斗中临时购买道具。

11. 不要让演员好感影响战斗属性。

12. 不要让 Zog 好感直接影响演员战斗数值。

13. 不要做复杂动态赔率。

14. 不要做节目效果分，除非重写 FinalScore。

---

## 23. 最小可跑伪代码

```ts
async function runNextActorAction() {
  if (battle.phase !== 'RUNNING') return;
  if (battle.clockState === 'PAUSED') return;

  cleanupExpiredStatuses();

  const broadcast = popReadyDirectorBroadcastIfAny();

  if (shouldEndBattle()) {
    finalizeBattle();
    return;
  }

  const activeActor = selectActiveActor(battle.actors, battle.actorActionIndex);

  const lockedTarget = resolveLockedTarget({
    activeActor,
    actors: battle.actors,
    scene: battle.scene,
    currentBeat: battle.currentBeat,
    actionIndex: battle.actorActionIndex,
  });

  const allowedActionTypes = buildAllowedActionTypes({
    activeActor,
    lockedTarget,
    actors: battle.actors,
    scene: battle.scene,
    statuses: activeActor.statuses,
    currentBeat: battle.currentBeat,
    directorBroadcast: broadcast,
  });

  const showrunnerContext = buildShowrunnerContext({
    activeActor,
    lockedTarget,
    allowedActionTypes,
    currentBeat: battle.currentBeat,
    directorBroadcast: broadcast,
  });

  const actorPrompt = buildActorBrainPrompt({
    activeActor,
    lockedTarget,
    allowedActionTypes,
    showrunnerContext,
    directorBroadcast: broadcast,
    battleStateSummary: summarizeBattleStateForLLM(battle),
  });

  const generation = await callActorBrainWithTimeout(actorPrompt, 20000);

  const validatedOutput = await validateOrFallback({
    generation,
    activeActor,
    lockedTarget,
    allowedActionTypes,
    stateVersionAtStart: battle.stateVersion,
  });

  const commitResult = combatRefereeCommit({
    battleId: battle.id,
    stateVersion: battle.stateVersion,
    actorActionIndex: battle.actorActionIndex,
    activeActorId: activeActor.actorId,
    lockedTargetId: lockedTarget?.actorId ?? null,
    actionType: validatedOutput.actionType,
    actorBrainOutput: validatedOutput,
  });

  applyCommitResult(commitResult);
  enqueueDisplayEvents(commitResult.event);

  if (shouldEndBattle()) {
    finalizeBattle();
    return;
  }

  if (battle.runMode === 'AUTO' && battle.clockState === 'PLAYING') {
    scheduleNextActorAction();
  }
}
```

---

## 24. 最终实现判断标准

实现完成后，必须满足以下判断：

1. 玩家输入“下雨了”，只会生成 directorBroadcast，并作为 ActorBrain 业务提示词第一段注入，不会直接改任何硬状态。

2. 玩家输入“TDog 死了”，会被 REJECT。

3. 玩家输入“把 TDog 打死”，会被 DOWNGRADE 成节目事故广播，不直接扣 HP。

4. ActorBrain 不能攻击非 lockedTarget。

5. ActorBrain 不能使用白名单外 actionType。

6. ActorBrain 说“我造成 999 点伤害”不会影响真实伤害。

7. WarReporter 不会播报未发生的死亡。

8. DisplayQueue 播放失败不会回滚状态。

9. LLM 超时不会卡死战斗。

10. 目标在生成期间出局，不会提交旧动作。

11. STEAL_DODOS 不会凭空复制渡渡鸟。

12. BRIBE_DODOS_WITH_FOOD 不会凭空增加渡渡鸟。

13. TAUNT 会强制下一次合法目标选择。

14. SHIELD_ONCE 只抵挡一次实际伤害。

15. 达到 40 次 Actor Action 后按 FinalScore 结算。

只要以上 15 条成立，Zog V2 的首发战斗主循环就具备可控性。之后再扩 Beat、道具和频道，都不会把核心系统重新打散。
