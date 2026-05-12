# Zog V2 架构文档

## 1. 架构目标

Zog V2 的首发架构目标是让 AI 节目战斗稳定可控，并适合 vibecoding 分模块开发。

核心原则：

1. LLM 负责表演，不负责规则。
2. BattleEngine 负责编排，不直接写具体数值规则。
3. CombatReferee 是唯一战斗裁判。
4. BattleShowrunner 不选择真实 activeActor，不选择真实 target，不改数值。
5. ActorBrain 只能从 allowedActionTypes 中选择 actionType。
6. 玩家上帝指令只生成 directorBroadcast，不直接改任何硬状态。
7. UI 不直接改战斗状态，只发出玩家意图。
8. 所有随机必须可复现。

## 2. 推荐目录

```txt
src/
  core/
    battle/
      types.ts
      actionDefs.ts
      rng.ts
      initialState.ts
      activeActorSelector.ts
      targetResolver.ts
      actionPolicy.ts
      validator.ts
      combatReferee.ts
      finalScore.ts
      eventLog.ts
    command/
      commandTypes.ts
      commandGate.ts
      directorBroadcast.ts
    economy/
      betting.ts
      rewards.ts
      items.ts
      upgrades.ts
    actors/
      actorCatalog.ts
      actorProgression.ts
  engine/
    battleEngine.ts
    queues.ts
    runNextActorAction.ts
    battleSimulation.ts
  llm/
    clients/
      llmClient.ts
      byokConfig.ts
    prompts/
      actorBrainPrompt.ts
      commandGatePrompt.ts
      reporterPrompt.ts
      showrunnerPrompt.ts
    actorBrainProvider.ts
    commandGateProvider.ts
    jsonRepair.ts
  features/
    battle/
      components/          # React UI 层（先粗 UI 跑通，后续与 PIXI 共存）
      hooks/
      battleStore.ts
      display/
        displayTypes.ts    # DisplayQueue / DisplayEvent 表现协议
        displayMapper.ts   # BattleEvent -> DisplayEvent
      renderer/            # PIXI 渲染层（美术替换阶段接入）
        BattleRenderer.ts
        ActorSprite.ts
        DodoPool.ts
        SceneEffects.ts
        AssetManifest.ts
        TextureAtlas.ts
    lounge/
      components/
      loungeStore.ts
    actors/
      components/
      actorStore.ts
    shop/
      components/
      shopStore.ts
    reports/
      components/
      reportStore.ts
  adapters/
    storage/
      gameStorage.ts
    telemetry/
      battleLogger.ts
  app/
    routes/
    App.tsx
```

## 3. 层级职责

### 3.1 core 层

纯规则层。

允许：

- 定义类型。
- 计算 activeActor。
- 计算 lockedTarget。
- 生成 allowedActionTypes。
- 校验 ActorBrain 输出。
- 结算 actionType。
- 判断终局和排名。
- 计算金币、赔率、片酬、道具效果。

禁止：

- 调用 LLM。
- 读写 UI 状态。
- 读写 localStorage。
- 使用 Math.random。
- 直接处理 React 事件。

### 3.2 engine 层

战斗编排层。

允许：

- 管理 BattlePhase、RunMode、ClockState。
- 管理 generationQueue、commitQueue、displayQueue。
- 在安全点推进一次 Actor Action。
- 调用 core 纯规则函数。
- 调用 LLM Provider。
- 维护 engine 内部的临时 DisplayQueue，并提供 drain 接口给 feature store。

禁止：

- 自己写伤害公式。
- 自己修改金币、片酬、库存。
- 绕过 Validator。
- 让 UI 播放状态回滚战斗状态。

### 3.3 llm 层

AI 适配层。

允许：

- 构建 Prompt。
- 调 BYOK / 默认模型。
- 解析 JSON。
- repair once。
- 生成 fallback output。

禁止：

- 直接改 BattleState。
- 直接判胜负。
- 直接决定真实 target。
- 直接决定伤害数字。

### 3.4 features 层（UI + 渲染）

业务 UI 层和渲染层分离：

#### 3.4.1 React UI 组件（features/battle/components/）

当前占位层，开发阶段使用。

允许：

- 展示战斗状态。
- 展示 battle store 中的 displayLog。
- 发出玩家意图。
- 管理页面级 UI 状态。
- 在粗 UI 阶段用 CSS/HTML 占位表现角色、渡渡鸟、巢区和行动反馈。

禁止：

- 直接扣 HP。
- 直接增减金币。
- 直接增减库存。
- 直接插入 BattleEvent。
- 粗 UI 阶段绑定真实美术资源路径。
- 直接实现 PIXI 动画状态机。

#### 3.4.2 PIXI 渲染层（features/battle/renderer/）

游戏可视化层，基于 PIXI.js，负责角色动画、场景效果、过渡动画。

允许：

- 读取 BattleState 中的 actor 位置、状态、HP 比例。
- 读取 battle store 中的 displayLog / 新增 DisplayEvent 来驱动动画。
- 管理 PIXI Application 生命周期。
- 处理输入事件并转发为玩家意图。

禁止：

- 直接修改 BattleState。
- 写战斗规则。
- 调用 core 纯规则函数。

**注意**：渲染层是纯展示层，通过 BattleStore 订阅状态变化。PIXI 层和 React UI 层通过共享 BattleStore 保持同步。

**注意**：粗 UI 阶段 React 可以画临时占位，但占位组件不能变成战斗规则来源。后续接入 PIXI 时，只替换视觉表现，不重写 BattleEngine、CombatReferee、ActorBrain、CommandGate。

### 3.5 adapters 层

外部适配层。

允许：

- 存档。
- 读写 BYOK 配置。
- 打日志。
- 封装平台能力。

禁止：

- 藏战斗规则。
- 藏经济规则。

## 4. 核心数据模型

### 4.1 BattleState

```ts
export interface BattleState {
  battleId: string;
  battleSeed: string;
  phase: BattlePhase;
  runMode: RunMode;
  clockState: ClockState;
  stateVersion: number;
  actorActionIndex: number;

  actors: ActorCombatState[];
  scene: SceneState;

  currentBeat?: DramaBeat;
  directorBroadcasts: DirectorBroadcast[];
  commandTransactions: CommandTransaction[];

  eventLog: BattleEvent[];

  playerSupport?: PlayerSupportState;
  itemUsesRemaining: number;
  usedItemIds: string[];
  actorPromptInjections: ActorPromptInjection[];
  selectedMutation?: ProgramMutation;
  stageBriefs: StageBrief[];
  salaryAwards: SalaryAward[];
  reporterMemory: ReporterMemoryEntry[];
  reporterMemoryCursor: number;
}
```

注意：`BattleState` 不保存 `displayQueue`。展示队列是 `BattleEngine` 内部的 transient queue；`battleStore` 在安全点 drain 后写入 feature 层的 `displayLog`，React 粗 UI 和 PIXI 都消费这个展示历史。这样表现失败不会污染战斗事实状态，也不会要求回滚 `BattleState`。

### 4.2 BattlePhase

```ts
export type BattlePhase =
  | 'PREPARING'
  | 'RUNNING'
  | 'RESOLVING_COMMAND'
  | 'FINAL_REPORT';
```

### 4.3 RunMode / ClockState

```ts
export type RunMode = 'AUTO' | 'MANUAL';
export type ClockState = 'PLAYING' | 'PAUSED';
```

### 4.4 ActorCombatState

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

### 4.5 ActorSceneState

```ts
export interface ActorSceneState {
  dodosControlled: number;
  dodoTrust: number;
  nestInfluence: number;
}
```

### 4.6 SceneState

```ts
export interface SceneState {
  totalDodos: number;
  wildDodos: number;
}
```

首发不设置旧版全局硬字段。天气、食物、鸟群氛围只作为 directorBroadcast、Drama Beat 或播报包装存在。

### 4.7 ActorBattleStats

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

### 4.8 DirectorBroadcast

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

Prompt 拼接规则：

1. 在 ActorBrain Prompt 中，directorBroadcast.text 必须放在业务提示词第一段。
2. 位置在硬系统规则之后，演员人设和战场摘要之前。
3. 标题固定为 `[DIRECTOR BROADCAST / MUST ACKNOWLEDGE]`。
4. CombatReferee 不读取 directorBroadcast.text 做数值结算。

### 4.9 CommandTransaction

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

export interface CommandTransaction {
  transactionId: string;
  rawInput: string;
  normalizedInput: string;
  status: CommandTransactionStatus;
  createdAtActionIndex: number;
  estimatedCost: number;
  frozenCost: number;
  result?: CommandGateResult;
  directorBroadcast?: DirectorBroadcast;
  rejectReason?: string;
}
```

### 4.10 ActionType

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
```

### 4.11 ActionDef

```ts
export type TargetPolicy =
  | 'TARGET_REQUIRED'
  | 'SELF_ONLY'
  | 'GLOBAL'
  | 'OPTIONAL_TARGET';

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
```

### 4.12 ActorBrainOutput

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

### 4.13 CommitInput / CommitResult

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

### 4.14 BattleEvent

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

### 4.15 PlayerSupportState

```ts
export interface PlayerSupportState {
  supportedActorId: string;
  betAmount: number;
  odds: number;
  locked: boolean;
}
```

## 5. 核心数据流

### 5.1 一次 Actor Action

```txt
beforeNextActorAction
  -> cleanupExpiredStatuses
  -> injectReadyDirectorBroadcast
  -> shouldEndBattle
  -> selectActiveActor
  -> resolveLockedTarget
  -> buildAllowedActionTypes
  -> buildShowrunnerContext
  -> buildActorBrainPrompt
  -> call ActorBrain Provider
  -> validateOrFallback
  -> combatRefereeCommit
  -> applyCommitResult
  -> enqueueDisplayEvent
  -> shouldEndBattle
  -> scheduleNextActorAction
```

### 5.2 玩家上帝指令

```txt
player input
  -> freeze estimated cost
  -> CommandTransaction QUEUED
  -> CommandGate JUDGING
  -> ALLOW / ASK / DOWNGRADE / REJECT
  -> DirectorBroadcast READY_TO_INJECT
  -> next beforeNextActorAction
  -> Prompt first business block
  -> ActorBrain acknowledges
```

### 5.3 道具使用

```txt
player use item
  -> check battle phase
  -> check target is supported actor
  -> check item inventory > 0
  -> check itemUsesRemaining > 0
  -> queue item use until safe point
  -> apply item effect
  -> inventory -1
  -> itemUsesRemaining -1
  -> write BattleEvent
```

## 6. 模块边界

### 6.1 activeActorSelector.ts

输入：

```ts
actors: ActorCombatState[];
actorActionIndex: number;
battleSeed: string;
```

输出：

```ts
ActorCombatState
```

禁止：

- 调 LLM。
- 看 UI 状态。
- 修改演员。

### 6.2 targetResolver.ts

输入：

```ts
activeActor: ActorCombatState;
actors: ActorCombatState[];
currentBeat?: DramaBeat;
actorActionIndex: number;
battleSeed: string;
```

输出：

```ts
ActorCombatState | null
```

必须处理：

- TAUNT_1_ACTION。
- Beat 聚焦目标。
- THREAT 索敌。
- 无合法目标。

### 6.3 actionPolicy.ts

输入：

```ts
activeActor: ActorCombatState;
lockedTarget?: ActorCombatState | null;
scene: SceneState;
currentBeat?: DramaBeat;
directorBroadcasts: DirectorBroadcast[];
```

输出：

```ts
ActionType[]
```

必须使用 ACTION_DEFS。

### 6.4 validator.ts

输入：

```ts
output: ActorBrainOutput;
activeActor: ActorCombatState;
lockedTarget?: ActorCombatState | null;
allowedActionTypes: ActionType[];
stateVersionAtStart: number;
currentStateVersion: number;
```

输出：

```ts
ValidatedActorBrainOutput | ValidationFailure
```

必须校验：

- actorId 是否等于 activeActorId。
- actionType 是否在 allowedActionTypes。
- targetEcho 是否匹配 lockedTarget。
- activeActor 是否仍存活。
- target 是否仍存活。
- stateVersion 是否仍有效。

### 6.5 combatReferee.ts

输入：

```ts
BattleState;
CommitInput;
```

输出：

```ts
CommitResult;
```

禁止：

- 读取玩家原话。
- 读取 directorBroadcast.text 做数值结算。
- 解析演员台词含义。
- 调 LLM。

### 6.6 battleEngine.ts

输入：

```ts
BattleState;
ActorBrainProvider;
ShowrunnerProvider;
```

输出：

```ts
BattleState;
```

职责：

- 推进一次安全点。
- 管队列。
- 调 core。
- 调 LLM Provider。
- 应用 CommitResult。

禁止：

- 自己写 actionType 数值效果。
- 绕过 Validator。

## 7. 随机规则

禁止使用 `Math.random`。

统一入口：

```ts
seededRng(
  battleSeed: string,
  actorActionIndex: number,
  namespace: string,
  actorId?: string | null,
  targetId?: string | null
): number
```

所有随机必须传 namespace，例如：

```txt
activeActorTieBreak
targetTieBreak
damageVariance
itemSideEffect
mvpTieBreak
finalScoreTieBreak
```

## 8. 首发状态边界

首发硬状态只有：

- HP。
- ATK / DEF / SPD。
- baseThreat / currentThreat。
- actor statuses。
- totalDodos / wildDodos。
- dodosControlled / dodoTrust / nestInfluence。
- actorActionIndex。
- stateVersion。
- itemUsesRemaining。
- CommandTransaction。
- DirectorBroadcast。
- EventLog。

首发不做：

- 旧版全局硬字段。
- 环境自动升压系统。
- 战中临时购买道具。
- BattleShowrunner 选 activeActor。
- ActorBrain 选真实 target。
- WarReporter 改状态。
- UI 改状态。

## 9. UI 状态边界

Battle UI 只能发出：

```ts
pauseBattle()
resumeBattle()
stepBattle()
submitCommand(rawInput)
answerCommandClarification(transactionId, targetActorId)
useItem(itemId, targetActorId)
switchRunMode(runMode)
```

Battle UI 不允许：

- 直接调用 combatRefereeCommit。
- 直接写 BattleEvent。
- 直接改 currentHP。
- 直接改 player金币。
- 直接改 item inventory。

## 11. PIXI 渲染层架构

### 11.1 设计原则

V2 采用 **React UI + PIXI 渲染分离** 的双层架构：

- **React UI 层**：交互逻辑、数据展示、页面导航（`features/battle/components/`）
- **PIXI 渲染层**：角色动画、场景效果、视觉表现（`features/battle/renderer/`）

两者的关系：
- 共享 `BattleStore` 作为单一数据源
- PIXI 渲染层订阅 BattleState 的变化，驱动动画
- React UI 层通过 BattleStore 发出玩家意图
- 两者通过事件驱动保持松耦合

### 11.2 推荐目录

```txt
features/battle/renderer/
  BattleRenderer.ts      # PIXI Application 管理，渲染入口
  ActorSprite.ts          # 演员精灵管理（立绘、动画状态机）
  DodoPool.ts             # 渡渡鸟对象池
  SceneEffects.ts         # 场景效果（CRT、光晕、过渡）
  AnimationController.ts  # 动画控制器
  TextureAtlas.ts         # 纹理图集管理
  AssetManifest.ts        # V1/V2 美术资源映射表
```

### 11.3 BattleRenderer.ts 职责

```ts
class BattleRenderer {
  app: PIXI.Application
  actorSprites: Map<string, ActorSprite>
  dodoPool: DodoPool

  // 初始化 PIXI Application
  init(container: HTMLElement): void

  // 同步 BattleState -> PIXI 场景
  syncState(state: BattleState): void

  // 消费 battleStore.displayLog / 新增 DisplayEvent，驱动动画播放
  playNextDisplayItem(): void

  // 处理输入事件，转发为玩家意图
  handleActorClick(actorId: string): void
}
```

### 11.4 ActorSprite 职责

每个演员的 PIXI 精灵管理：

- **站立**：待机动画
- **攻击**：根据 actionType 播放对应动画
- **受击**：HP 变化动画 + 击退效果
- **死亡**：出局动画
- **聚焦**：聚光灯跟随

### 11.5 开发阶段策略

V2 明确采用“先粗 UI 跑通，后批量替换美术”的开发策略。

**阶段 A：React 粗 UI 跑通**

- React UI 组件直接用 CSS 占位（如 `<div class="actor-placeholder">`）
- 不需要 PIXI 渲染层
- 优先验证游戏逻辑
- 粗 UI 必须能展示 actor、HP、状态、渡渡鸟控制数、巢区影响力、当前行动、队列反馈
- 粗 UI 必须能完成一整局：下注、使用道具、输入上帝指令、自动/暂停/手动推进、进入结算
- 粗 UI 允许丑，但不允许缺关键状态

**阶段 B：表现协议冻结**

- 固定 `DisplayEvent` / engine DisplayQueue / battleStore displayLog 字段
- 固定 BattleEvent 到 DisplayEvent 的映射
- 固定每种 `ActionType` 至少对应一个表现事件
- UI 和 PIXI 都只能消费 DisplayEvent，不允许从台词里猜动画
- DisplayQueue / displayLog 播放失败只影响表现，不回滚战斗状态

**阶段 C：PIXI 渲染接入**

- 替换 React UI 占位为 PIXI 渲染
- 复用 V1 的 PIXI 资源（纹理图集、动画文件）
- 验证渲染层和 UI 层同步
- React 保留按钮、面板、输入框、账单、战报等交互 UI
- PIXI 负责角色、渡渡鸟、场景、动作、受击、出局、聚焦等动态表现
- PIXI 只根据 BattleState 快照和 DisplayEvent 播放，不决定任何数值结果

### 11.6 V1 资源复用

V1 中已有的 PIXI 资源可以直接复用：

- 演员立绘精灵图
- 渡渡鸟精灵图
- 场景背景资源
- 动画 Spine 文件（如果有）

建议在 `public/assets/` 下保持 V1 的资源结构，V2 渲染层按需引用。

V1 资源必须通过 `AssetManifest` 映射，不允许在 React 组件或 PIXI 组件里散落硬编码路径。

```ts
type AssetManifest = {
  actors: Record<ActorId, ActorAsset>;
  dodos: DodoAsset;
  scenes: Record<SceneId, SceneAsset>;
  effects: Record<DisplayEffectType, EffectAsset>;
};

type ActorAsset = {
  idle: AssetRef;
  attack?: Partial<Record<ActionType, AssetRef>>;
  hit?: AssetRef;
  defeated?: AssetRef;
  portrait?: AssetRef;
};
```

### 11.7 DisplayEvent 表现协议

`DisplayEvent` 是战斗结果和视觉表现之间的唯一桥。

```ts
type DisplayEvent = {
  displayEventId: string;
  sourceBattleEventId: string;
  kind: DisplayEventKind;
  actorId?: ActorId;
  targetActorId?: ActorId;
  actionType?: ActionType;
  numericDelta?: {
    hp?: number;
    dodosControlled?: number;
    trust?: number;
    nestInfluence?: number;
  };
  text?: string;
  durationMs?: number;
  priority: number;
};

type DisplayEventKind =
  | 'ACTOR_FOCUS'
  | 'ACTION_START'
  | 'ACTION_HIT'
  | 'DODOS_MOVE'
  | 'STATUS_APPLIED'
  | 'ACTOR_DEFEATED'
  | 'DIRECTOR_BROADCAST'
  | 'ROUND_SUMMARY';
```

规则：

- DisplayEvent 只能由 BattleEvent 映射生成。
- DisplayEvent 不允许携带新的战斗结算结果。
- PIXI 可以根据 DisplayEvent 选择动画，但不能修改 BattleState。
- React 粗 UI 和 PIXI 渲染层消费同一套 DisplayEvent/displayLog。
- 批量替换美术时只允许改 `renderer/`、`AssetManifest`、资源文件和表现样式，不允许改 core 规则。

---

## 12. 可测试性要求

每个 core 模块都必须能单测。

最低测试清单：

1. activeActor 选择稳定。
2. target 选择稳定。
3. TAUNT 强制目标。
4. allowedActionTypes 受状态影响。
5. ActorBrain 输出越权会被 Validator 拦截。
6. STEAL_DODOS 不复制渡渡鸟。
7. BRIBE_DODOS_WITH_FOOD 不凭空增加渡渡鸟。
8. SHIELD_ONCE 只抵挡一次实际伤害。
9. 40 次上限按 FinalScore 结算。
10. directorBroadcast 不直接改任何硬状态。
