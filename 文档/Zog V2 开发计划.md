# Zog V2 开发计划

## 1. 开发目标

首发目标是跑通“荒岛渡渡鸟节目”的完整闭环：

```txt
客厅入口
  -> 选择频道
  -> 抽取 5 名演员
  -> 可选节目变异液
  -> 下注支持演员
  -> 自动/手动节目战斗
  -> 玩家上帝指令插播
  -> 战中道具救场
  -> 终局结算
  -> 战报和节目账单
  -> 回到客厅
```

首发必须优先验证：

1. AI 演员真的会围绕渡渡鸟、巢区、陷害和互殴行动。
2. 玩家上帝指令能被节目接住，但不破坏规则。
3. 战斗结果可控、可回看、可结算。
4. BYOK 能接入 ActorBrain。
5. Zog 在客厅和战斗前景里有陪看存在感。

## 2. 总体开发顺序

推荐顺序：

1. 类型和纯规则。
2. 战斗模拟器。
3. LLM 接入。
4. BattleEngine 编排。
5. 道具、下注、变异液。
6. React 粗战斗 UI。
7. DisplayQueue 表现协议冻结。
8. PIXI 美术渲染接入。
9. 战报和账单。
10. 客厅和经济闭环。
11. Zog 表现和收尾打磨。

不要一开始做完整 UI，更不要一开始接 PIXI 和正式美术资源。先跑通无 UI 的 battleSimulation，再用 React 粗 UI 跑通完整交互，最后批量替换美术表现。

## 3. 开发总规则

### 3.1 模块开发规则

每个 vibecoding 任务必须写清：

```txt
只改哪些文件
输入是什么
输出是什么
禁止做什么
需要哪些测试
```

如果一个任务同时涉及 core、llm、UI、storage，说明任务太大，必须拆。

### 3.2 代码边界规则

1. core 不调用 LLM。
2. core 不读写 UI。
3. core 不读写 storage。
4. engine 可以调用 core 和 llm provider。
5. UI 只能调用 engine/store action。
6. CombatReferee 是唯一战斗裁判。
7. CommandGate 不改数值，只生成 directorBroadcast。
8. DisplayQueue 不改状态，只消费 committed event。

### 3.3 AI 输出规则

1. ActorBrain 输出必须结构化。
2. ActorBrain 只能从 allowedActionTypes 选 actionType。
3. ActorBrain 不决定真实 target。
4. ActorBrain 不能声明具体伤害数字。
5. ActorBrain 不能声明胜利、死亡、金币变化、道具变化。
6. LLM 输出必须经过 Validator。
7. repair once 失败必须 fallback。

### 3.4 状态规则

1. 所有战斗状态变化必须产生 BattleEvent。
2. 所有状态变化必须可从 EventLog 回看。
3. 所有随机必须可复现。
4. 玩家上帝指令不直接改硬状态。
5. 战斗中禁止临时购买道具。
6. 冰箱只决定本局道具使用次数。

### 3.5 测试规则

优先写 core 单测，再写集成模拟。

每个 P0 模块必须至少有：

- 正常输入测试。
- 边界输入测试。
- 越权/非法输入测试。
- 稳定随机测试。

### 3.6 粗 UI 和美术替换规则

V2 采用“先粗 UI 后批量替换美术”。

1. 粗 UI 是正式开发阶段，不是临时脏实现。
2. 粗 UI 只验证玩法闭环和操作可理解性。
3. 粗 UI 不绑定 V1 美术资源路径。
4. 粗 UI 不实现 PIXI 动画状态机。
5. 粗 UI 可以用 CSS 方块、名字、血条、状态标签、数字面板表达战斗。
6. PIXI 接入前必须冻结 DisplayEvent / DisplayQueue 协议。
7. PIXI 只消费 BattleState 快照和 DisplayEvent。
8. PIXI 不允许修改 BattleState、金币、库存、Actor 状态、渡渡鸟数量。
9. 美术资源路径必须集中在 AssetManifest，不允许散落在 React 组件或 PIXI 组件里。
10. 批量替换美术时只允许改表现层文件、资源文件和样式文件；如果需要改 core/engine，必须另开规则任务。

## 4. Phase 0：项目骨架和类型冻结

目标：建立目录、类型、行动表和测试框架。

### 4.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 0.1 | 建立目录结构 | `src/core`, `src/engine`, `src/llm`, `src/features` |
| 0.2 | 定义战斗类型 | `src/core/battle/types.ts` |
| 0.3 | 定义行动表 | `src/core/battle/actionDefs.ts` |
| 0.4 | 定义命令类型 | `src/core/command/commandTypes.ts` |
| 0.5 | 定义初始状态生成 | `src/core/battle/initialState.ts` |
| 0.6 | 建立测试框架 | 按现有项目技术栈选择 |

### 4.2 完成标准

- 能 import 所有核心类型。
- `ACTION_DEFS` 包含 10 个 actionType。
- `SceneState` 只有 `totalDodos` 和 `wildDodos`。
- `ActorSceneState` 只有 `dodosControlled`、`dodoTrust`、`nestInfluence`。
- 没有旧版全局硬字段。

### 4.3 禁止事项

- 不写 UI。
- 不接 LLM。
- 不写 BattleEngine。

## 5. Phase 1：纯战斗规则

目标：在无 UI、无 LLM 的情况下，能用假输出跑完整战斗。

### 5.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 1.1 | 稳定随机 | `src/core/battle/rng.ts` |
| 1.2 | activeActor 选择 | `src/core/battle/activeActorSelector.ts` |
| 1.3 | target 选择 | `src/core/battle/targetResolver.ts` |
| 1.4 | allowedActionTypes | `src/core/battle/actionPolicy.ts` |
| 1.5 | ActorBrain 输出校验 | `src/core/battle/validator.ts` |
| 1.6 | CombatReferee 结算 | `src/core/battle/combatReferee.ts` |
| 1.7 | FinalScore 和排名 | `src/core/battle/finalScore.ts` |
| 1.8 | EventLog helper | `src/core/battle/eventLog.ts` |

### 5.2 关键规则

activeActor 选择：

- 由 BattleEngine 调用 selector。
- selector 不修改 state。
- selector 用 `initiative + spotlightDebt + danger + broadcastPriority - recentPenalty`。
- 平分使用 seededRng。

target 选择：

- TAUNT 优先。
- Beat 聚焦其次。
- THREAT 索敌再次。
- 无合法目标时返回 null。

CombatReferee：

- 只读取 actionType、activeActor、lockedTarget。
- 不读取 directorBroadcast.text。
- 不解析台词。
- 每次 commit 成功后 actorActionIndex +1，stateVersion +1。

渡渡鸟守恒：

```txt
sum(actor.scene.dodosControlled) + scene.wildDodos <= scene.totalDodos
```

### 5.3 完成标准

- 所有 core 单测通过。
- STEAL_DODOS 不复制渡渡鸟。
- BRIBE_DODOS_WITH_FOOD 不凭空加鸟。
- SHIELD_ONCE 只抵挡一次实际伤害。
- TAUNT 能强制下一次合法目标选择。
- 40 次 Actor Action 后能按 FinalScore 结算。

### 5.4 禁止事项

- 不接真实 LLM。
- 不写 React UI。
- 不写存档。

## 6. Phase 2：战斗模拟器

目标：用 stub / random ActorBrain 跑完整节目。

### 6.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 2.1 | ActorBrainProvider 接口 | `src/llm/actorBrainProvider.ts` |
| 2.2 | stubActorBrain | `src/llm/stubActorBrain.ts` |
| 2.3 | randomActorBrain | `src/llm/randomActorBrain.ts` |
| 2.4 | runNextActorAction | `src/engine/runNextActorAction.ts` |
| 2.5 | queues | `src/engine/queues.ts` |
| 2.6 | battleSimulation | `src/engine/battleSimulation.ts` |

### 6.2 完成标准

- 能在开发环境直接跑一场 5 人、40 次上限的模拟战斗。
- 每次行动都有 BattleEvent。
- 能打印最终排名、胜者、MVP。
- 同一 battleSeed 结果一致。

### 6.3 禁止事项

- 不写复杂 UI。
- 不把 randomActorBrain 当正式 AI。

## 7. Phase 3：LLM 和 BYOK 接入

目标：把 ActorBrain 从 stub 切到真实 BYOK 模型，同时保持规则稳定。

### 7.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 3.1 | BYOK 配置读取 | `src/llm/clients/byokConfig.ts` |
| 3.2 | LLM client 抽象 | `src/llm/clients/llmClient.ts` |
| 3.3 | ActorBrain Prompt | `src/llm/prompts/actorBrainPrompt.ts` |
| 3.4 | JSON parse + repair once | `src/llm/jsonRepair.ts` |
| 3.5 | llmActorBrainProvider | `src/llm/actorBrainProvider.ts` |
| 3.6 | fallback output | `src/llm/fallbackActorBrain.ts` |

### 7.2 Prompt 必须包含

1. 你是演员脑，不是裁判。
2. 你不能决定伤害数字。
3. 你不能决定胜负。
4. 你不能决定任何演员死亡。
5. 你不能改变真实目标。
6. 你只能从 allowedActionTypes 中选择 actionType。
7. 如果存在 directorBroadcast，你必须承认它。
8. directorBroadcast 放在业务提示词第一段。

### 7.3 完成标准

- 真实模型能输出合法 JSON。
- 非法 JSON 能 repair once。
- repair 失败走 fallback。
- 模型超时 20 秒后 fallback。
- BYOK 模型失败不会卡死战斗。

### 7.4 禁止事项

- 不允许 LLM 输出直接写入 BattleState。
- 不允许 LLM 决定 target。
- 不允许 LLM 写伤害数字后被裁判采信。

## 8. Phase 4：CommandGate 和上帝指令

目标：玩家随时输入上帝指令，系统能排队、预审、注入 Prompt。

### 8.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 4.1 | CommandGate 类型 | `src/core/command/commandTypes.ts` |
| 4.2 | CommandGate provider | `src/llm/commandGateProvider.ts` |
| 4.3 | CommandGate Prompt | `src/llm/prompts/commandGatePrompt.ts` |
| 4.4 | DirectorBroadcast helper | `src/core/command/directorBroadcast.ts` |
| 4.5 | CommandTransaction 队列 | `src/engine/queues.ts` |
| 4.6 | 计费冻结/结算 | `src/core/economy/commandCost.ts` |

### 8.2 CommandGate 四态

```txt
ALLOW -> READY_TO_INJECT
ASK -> WAITING_CLARIFICATION
DOWNGRADE -> READY_TO_INJECT
REJECT -> REJECTED
```

### 8.3 计费规则

- 提交时冻结预计费用。
- ASK 阶段不扣费。
- 按钮选人不计费。
- ALLOW 扣全额。
- DOWNGRADE 扣全额。
- 首次 REJECT 免费。
- 后续 REJECT 扣 30%。
- 系统失败全额退款。
- 节目结束未注入全额退款。

### 8.4 完成标准

- 玩家输入“下雨了”只生成 directorBroadcast，不改硬状态。
- 玩家输入“TDog 死了”会 REJECT。
- 玩家输入“打死 TDog”会 DOWNGRADE。
- 每个 Actor Action 前最多注入 1 条 directorBroadcast。
- 目标出局后能退款或降级为无目标广播。

## 9. Phase 5：BattleEngine 正式编排

目标：自动、暂停、手动、指令排队、道具排队都能稳定共存。

### 9.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 5.1 | BattleEngine 主类/函数 | `src/engine/battleEngine.ts` |
| 5.2 | AUTO 推进 | `src/engine/battleEngine.ts` |
| 5.3 | MANUAL step | `src/engine/battleEngine.ts` |
| 5.4 | PAUSED 安全点 | `src/engine/battleEngine.ts` |
| 5.5 | displayQueue 消费 | `src/engine/queues.ts` |
| 5.6 | stateVersion 过期处理 | `src/engine/runNextActorAction.ts` |

### 9.2 完成标准

- AUTO 能连续跑完整局。
- MANUAL 每点一次只推进一次 Actor Action。
- PAUSED 停在安全点。
- LLM 生成中输入指令不会打断当前生成。
- Display 播放失败不回滚战斗状态。
- stateVersion 过期会丢弃旧 generation 并回到安全点。

## 10. Phase 6：经济、下注、道具、变异液

目标：战斗前后金币闭环成立。

### 10.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 6.1 | 赔率计算 | `src/core/economy/betting.ts` |
| 6.2 | 下注规则 | `src/core/economy/betting.ts` |
| 6.3 | 片酬结算 | `src/core/economy/rewards.ts` |
| 6.4 | 道具库存和使用次数 | `src/core/economy/items.ts` |
| 6.5 | 设备升级 | `src/core/economy/upgrades.ts` |
| 6.6 | 节目变异液 | `src/core/battle/mutations.ts` |

### 10.2 关键规则

下注：

- 开播前下注。
- 确认后不可取消。
- 抽卡重连会取消下注并退款。
- 战斗开始后下注锁定。

道具：

- 战斗前购买。
- 战斗中不能临时购买。
- 冰箱决定本局使用次数。
- 每次成功使用：库存 -1，itemUsesRemaining -1。
- 救场类道具只能用于支持演员。

变异液：

- 可不购买。
- 购买后 500G。
- 随机 3 选 1。
- 不可退款，不可刷新，不可跳过选择。
- 不得引入旧版全局硬字段。

### 10.3 完成标准

- 赌赢返还 `floor(betAmount * odds)`。
- 赌输本金归零。
- 演员好感下注时增加。
- 胜者片酬 + MVP 片酬可叠加。
- 道具不能超过本局使用次数。
- 变异液能进入 BattleState 并影响 Prompt 或已有 action 数值项。

## 11. Phase 7：战斗 UI 和美术替换管线

目标：先用 React 粗 UI 跑通完整战斗交互，再冻结表现协议，最后接入 PIXI 和 V1 美术资源。

### 11.1 Phase 7A：React 粗 UI

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 7A.1 | Battle 页面布局 | `src/features/battle/components/BattlePage.tsx` |
| 7A.2 | 演员状态栏 | `src/features/battle/components/ActorStatusPanel.tsx` |
| 7A.3 | 渡渡鸟池和演员场景数值 | `src/features/battle/components/DodoScoreboard.tsx` |
| 7A.4 | 粗表现区 | `src/features/battle/components/BattleDisplay.tsx` |
| 7A.5 | 上帝指令输入 | `src/features/battle/components/CommandInput.tsx` |
| 7A.6 | AUTO/MANUAL/PAUSED 控制 | `src/features/battle/components/BattleControls.tsx` |
| 7A.7 | 道具使用 UI | `src/features/battle/components/BattleItems.tsx` |
| 7A.8 | Zog 前景占位 | `src/features/battle/components/ZogForeground.tsx` |

Phase 7A 必须先完成，且可以没有任何正式美术资源。

允许：

- 用 CSS 方块、头像占位、名字、血条、状态标签表达角色。
- 用文字和数字表达渡渡鸟控制数、信任、巢区影响力。
- 用简单列表表达 DisplayQueue 播放。
- 用临时颜色表达阵营、目标、受击、出局。

禁止：

- 不直接改 HP。
- 不直接改金币。
- 不直接改库存。
- 不直接插 BattleEvent。
- 不直接触发 CombatReferee。
- 不绑定正式美术资源路径。
- 不接 PIXI。
- 不写动画状态机。

完成标准：

- 玩家能看到 HP、状态、渡渡鸟控制、信任、巢区影响力。
- 玩家能输入上帝指令。
- 指令排队有反馈。
- REJECT / DOWNGRADE / ASK 有反馈。
- 道具次数和库存清楚。
- Zog 前景不遮挡核心 UI。
- 玩家能完成一整局并进入结算。

### 11.2 Phase 7B：DisplayQueue 表现协议冻结

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 7B.1 | 定义 DisplayEvent 类型 | `src/features/battle/display/displayTypes.ts` |
| 7B.2 | BattleEvent -> DisplayEvent 映射 | `src/features/battle/display/displayMapper.ts` |
| 7B.3 | DisplayQueue 播放器接口 | `src/features/battle/display/displayQueue.ts` |
| 7B.4 | 每种 ActionType 的默认表现 | `src/features/battle/display/actionDisplayMap.ts` |
| 7B.5 | 粗 UI 接入 DisplayEvent | `src/features/battle/components/BattleDisplay.tsx` |

关键规则：

- DisplayEvent 只能从 committed BattleEvent 映射生成。
- DisplayEvent 不能携带新的结算结果。
- DisplayEvent 不能从 ActorBrain 台词里解析数值。
- DisplayQueue 播放失败不回滚 BattleState。
- 每个首发 ActionType 至少有一个默认 DisplayEvent。
- 粗 UI 和 PIXI 必须消费同一套 DisplayEvent。

完成标准：

- 跑完整局时 DisplayEvent 顺序稳定。
- 粗 UI 不读 BattleEvent 原始细节也能播放关键表现。
- DisplayEvent 可被单测覆盖。

### 11.3 Phase 7C：PIXI 美术渲染接入

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 7C.1 | PIXI 渲染入口 | `src/features/battle/renderer/BattleRenderer.ts` |
| 7C.2 | 演员精灵和动画状态 | `src/features/battle/renderer/ActorSprite.ts` |
| 7C.3 | 渡渡鸟对象池 | `src/features/battle/renderer/DodoPool.ts` |
| 7C.4 | 场景效果 | `src/features/battle/renderer/SceneEffects.ts` |
| 7C.5 | V1 资源映射表 | `src/features/battle/renderer/AssetManifest.ts` |
| 7C.6 | 纹理图集加载 | `src/features/battle/renderer/TextureAtlas.ts` |
| 7C.7 | React 容器挂载 PIXI | `src/features/battle/components/BattleCanvas.tsx` |

关键规则：

- PIXI 只负责表现，不负责规则。
- PIXI 只读取 BattleState 快照和 DisplayEvent。
- PIXI 不允许调用 CombatReferee、CommandGate、ActorBrain、BattleEngine commit。
- PIXI 不允许写 HP、金币、库存、渡渡鸟数量、演员状态。
- V1 美术资源路径只能写在 AssetManifest。
- React 继续负责按钮、输入框、面板、账单、战报等 UI。
- 美术替换不得改变已经通过的 Phase 7A 交互流程。

完成标准：

- React 粗 UI 可以关闭或降级为 debug 面板。
- PIXI 能播放站立、行动、受击、出局、聚焦、渡渡鸟变化。
- 同一局战斗在 React 粗 UI 和 PIXI 表现下结算一致。
- 资源加载失败时不阻断战斗推进，只显示占位表现。

## 12. Phase 8：战报和节目账单

目标：战斗结束后，玩家能看到本期节目具体发生了什么、赚亏多少、演员获得什么。

### 12.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 8.1 | WarReporter Prompt | `src/llm/prompts/reporterPrompt.ts` |
| 8.2 | 单轮播报 | `src/features/reports/reportGenerator.ts` |
| 8.3 | 最终战报 | `src/features/reports/finalReport.ts` |
| 8.4 | 节目账单 | `src/features/reports/bill.ts` |
| 8.5 | 战报收藏 | `src/features/reports/reportStore.ts` |

### 12.2 战报必须包含

- 节目标题。
- 本期摘要。
- 胜者。
- 排名。
- MVP。
- 高光台词。
- 最大节目事故。
- 玩家插手记录。
- 演员片酬。
- 玩家收益。
- Zog 反应。

### 12.3 完成标准

- WarReporter 不编造未提交事件。
- 战报能从 EventLog 复现核心过程。
- 节目账单金币收支清楚。

## 13. Phase 9：客厅和长线系统

目标：战斗外有可回归主界面和经济入口。

### 13.1 任务

| 编号 | 任务 | 文件 |
| --- | --- | --- |
| 9.1 | 客厅主界面 | `src/features/lounge/` |
| 9.2 | Zog 基础聊天入口 | `src/features/lounge/` |
| 9.3 | Zog 送礼 | `src/features/lounge/` |
| 9.4 | 挂机收益 | `src/core/economy/loungeIncome.ts` |
| 9.5 | 找 Zog 乞讨 | `src/core/economy/begging.ts` |
| 9.6 | 商店 | `src/features/shop/` |
| 9.7 | 演员花名册 | `src/features/actors/` |
| 9.8 | 电视入口 | `src/features/lounge/TVEntry.tsx` |

### 13.2 关键规则

- Zog 好感只通过送礼提升。
- 聊天、陪伴、观看节目、专注模式只触发表现和记录。
- 金币来源只有挂机、乞讨、赌博获胜。
- 演员好感只来自下注支持和演员送礼。

### 13.3 完成标准

- 玩家能从客厅进入节目。
- 玩家能送礼提升 Zog 好感。
- 玩家能挂机拿低保。
- 玩家能乞讨拿金币。
- 玩家能查看演员花名册和战报收藏。

## 14. Phase 10：打磨和验收

目标：首发闭环可玩、稳定、可调试。

### 14.1 功能验收

必须满足：

1. 玩家输入“下雨了”，只生成 directorBroadcast，不直接改任何硬状态。
2. 玩家输入“TDog 死了”，会 REJECT。
3. 玩家输入“把 TDog 打死”，会 DOWNGRADE。
4. ActorBrain 不能攻击非 lockedTarget。
5. ActorBrain 不能使用白名单外 actionType。
6. ActorBrain 说“我造成 999 点伤害”不会影响真实伤害。
7. WarReporter 不播报未发生的死亡。
8. DisplayQueue 播放失败不会回滚状态。
9. LLM 超时不会卡死战斗。
10. 目标在生成期间出局，不会提交旧动作。
11. STEAL_DODOS 不会复制渡渡鸟。
12. BRIBE_DODOS_WITH_FOOD 不会凭空增加渡渡鸟。
13. TAUNT 会强制下一次合法目标选择。
14. SHIELD_ONCE 只抵挡一次实际伤害。
15. 达到 40 次 Actor Action 后按 FinalScore 结算。

### 14.2 体验验收

必须满足：

1. 玩家能理解自己和 Zog 在看电视。
2. 战斗每轮都有行动和反馈。
3. AI 演员围绕渡渡鸟、巢区、鸟群信任和互相陷害行动。
4. 上帝指令有即时 UI 反馈。
5. 战报值得回看。
6. 玩家愿意再开下一局。

## 15. 推荐 vibecoding 派工模板

```txt
任务：
实现 src/core/battle/combatReferee.ts

只允许修改：
- src/core/battle/combatReferee.ts
- src/core/battle/combatReferee.test.ts

输入：
- BattleState
- CommitInput

输出：
- CommitResult

必须实现：
- 9 种首发 actionType
- SHIELD_ONCE
- TAUNT_1_ACTION 消耗
- STOMACHACHE_NO_ATTACK 限制
- 渡渡鸟守恒
- clamp
- 出局判断

禁止：
- 调用 LLM
- 读取 directorBroadcast.text 做数值结算
- 解析演员台词
- 读写 UI / storage
- 使用 Math.random

测试：
- 每种 actionType 至少 1 个测试
- STEAL_DODOS 目标不足时最多从 wildDodos 补 2
- SHIELD_ONCE 只抵挡一次 damage > 0
- HP 不能超过 maxHP
- 渡渡鸟总量不能超过 totalDodos
```

## 16. 最小可玩里程碑

### Milestone A：无 AI 战斗可跑

完成 Phase 0 - Phase 2。

结果：

- 命令行或开发面板能跑完整 40 次战斗。
- 有 EventLog。
- 有 FinalScore。

### Milestone B：AI 演员可跑

完成 Phase 3 - Phase 5。

结果：

- BYOK ActorBrain 可参与。
- 上帝指令可注入 Prompt。
- LLM 失败可 fallback。

### Milestone C：React 粗 UI 可操作

完成 Phase 6 - Phase 7A。

结果：

- 玩家能下注、用道具、输入上帝指令、自动/手动推进。
- 能完成一局并进入结算。
- 不要求 PIXI 和正式美术资源。

### Milestone C+：PIXI 美术表现接入

完成 Phase 7B - Phase 7C。

结果：

- DisplayEvent / DisplayQueue 协议冻结。
- PIXI 能消费同一套 DisplayEvent 播放表现。
- V1 美术资源通过 AssetManifest 批量接入。
- PIXI 表现失败不会影响战斗结算。

### Milestone D：首发闭环

完成 Phase 8 - Phase 10。

结果：

- 客厅 -> 节目 -> 战报 -> 客厅闭环成立。
- 经济收支成立。
- Zog 陪看感成立。

---

## 17. 设计真源与功能状态总表（2026-04-30）

### 17.1 文档权威规则

`【zog】V2_设计文档.md` 和 `【Zog】V2_数值文档.md` 是已经确认过的底层设计与远景文档。

开发计划的职责不是改写它们，而是把它们拆成可执行任务、标注实现状态、安排施工顺序。

如果开发计划、代码实现与这两份文档冲突，默认以设计文档和数值文档为准；除非后续明确产生新的确认文档。

### 17.2 状态标记

| 标记 | 含义 |
| --- | --- |
| DONE | 已实现且基本符合设计/数值文档 |
| PARTIAL | 有骨架或部分功能，但不完整或与源文档有偏差 |
| TODO | 还没有实现 |
| LATER | 源文档明确低优先级或第一版不做 |
| CHECK | 需要再次确认语义后再开发 |

### 17.3 全功能状态总表

| 系统 | 源文档依据 | 当前状态 | 已有实现 | 缺口/风险 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| 项目骨架 | 设计 23；开发 Phase 0 | DONE | `core/engine/llm/features` 分层已存在 | 仍有部分粗糙命名和乱码文案 | 后续随模块修 |
| BattleState 基础字段 | 设计 9；数值 11-12 | PARTIAL | HP、ATK、DEF、SPD、THREAT、SceneState、ActorSceneState 已有 | `totalDodos` 当前代码为 20，数值文档是 100；开局 `dodoTrust` 当前代码是 50，数值文档是 10 | 做一次“数值文档对齐”专门工单 |
| 首发演员库 | 数值 11.2 | PARTIAL | 有 `DEFAULT_ROSTER` 和花名册 UI | 当前不是数值文档的 10 名首发演员；HP/ATK/DEF/SPD/THREAT 也未对齐 | 替换为数值文档 10 名演员 |
| 行动类型表 | 设计 7.6；数值 13.2 | PARTIAL | 有 `ActionType`、`ACTION_DEFS`、CombatReferee 结算 | actionPower、伤害公式、渡渡鸟数量、THREAT 变化、TRIGGER_STAMPEDE 等与数值文档不完全一致 | 按数值文档重写 action 表和测试 |
| 伤害公式 | 数值 13.1 | PARTIAL | 有 seeded damage variance | 当前公式是 `ATK - DEF/2` 风格，不是数值文档公式 | 作为核心规则工单，不能交给 mini 自由发挥 |
| activeActor 选择 | 设计 10.4；战斗协议 | PARTIAL | BattleEngine 选择 activeActor；recent penalty 修过 | 缺 lastBreathPriority、directorBroadcastPriority 等完整权重 | 补候选池评分表和测试 |
| targetResolver | 设计 10.4；战斗协议 TAUNT | PARTIAL | TAUNT 来源已用 `tauntedByActorId`；THREAT 索敌存在 | TAUNT 多来源、失效清理、Beat 目标优先级还粗 | 补状态生命周期测试 |
| Drama Beat / BattleShowrunner | 设计 8、10 | TODO | `currentBeat` 类型存在 | 没有 Beat Deck、Beat 选择、阶段简报、镜头理由 | 先实现 deterministic Beat v0，后续再 LLM 包装 |
| ActorBrain | 设计 11；开发 Phase 3 | PARTIAL | LLM ActorBrain、Stub、Prompt builder 已有 | prompt 未拆 context/template/schema；演员人设和长期注入未接入；多模型演员未做 | 提示词阶段再拆，不让 mini 改 schema |
| BYOK / provider 解耦 | 设计 17 | DONE | `providerId/baseUrl/model/apiKey/debugMode` 绑定；直连 baseUrl；debug 可见 | 浏览器直连可能遇到 CORS，未来需要显式本地/后端代理 | 有 CORS 后再做显式代理 |
| LLM Debug | debug 文档 | DONE | `[LLM:FETCH:REQ/RES]` 可见完整 messages/response；不打印 key | localhost 下默认打印，正式发布需关闭或加 dev guard | 发布前做环境开关 |
| CommandGate 四态 | 设计 13；数值 5.5-5.6 | PARTIAL | ALLOW/ASK/DOWNGRADE/REJECT、quickEvaluate、broadcast 注入存在 | 字数上限、20G/字、首次 REJECT 免费/后续 30%、真实金币冻结/扣费仍未完全对齐 | 先做计费和键盘等级 |
| directorBroadcast | 设计 13.5 | PARTIAL | quick/LLM 通过后可注入 ActorBrain prompt | 生命周期、已回应记录、相关演员优先级不完整 | 与 activeActor priority 一起补 |
| @质问 | 设计 13.6；战斗协议 15 | TODO | 无独立 commandKind | 免费入口、文字计费、按钮选人不计费未做 | CommandGate 计费后再做 |
| 三队列架构 | 设计 14 | PARTIAL | generation/commit/display queue 有骨架；auto 并发已修 | 道具请求、指令注入、安全点排队还不完整 | 先冻结 DisplayEvent，再整理队列 |
| BattleEngine 生命周期 | 开发 Phase 5；debug 文档 | DONE | dispose、isStepping、engineId guard 已补 | 仍需更多 UI 压测 | 保持不乱改 |
| 道具库存/商店 | 设计 19、21；数值 10 | PARTIAL | 商店、库存、战中使用、`ITEM_USED`、冰箱次数骨架存在 | 道具表、价格、效果与数值文档不一致；救场类只能给支持演员未做；回血限制未做；失败 UI 不足 | 下一阶段优先补 |
| 道具回血 | 数值 10.2-10.3 | PARTIAL | `HEAL_SMALL/HEAL_MEDIUM` 能回血且不超过 maxHP | 数值文档是劣质机油 20HP、急救罐头 35HP、高能嘲讽电池 60HP+护盾；同演员两次行动间最多回血一次未做 | 道具闭环工单 |
| 道具副作用 | 设计 21；数值 10.2 | TODO | `SHIELD_ONCE`、`TAUNT_1_ACTION` 类型存在 | 肠胃不适、金主走后门广播、TAUNT 由道具触发等未完成 | 道具闭环二期 |
| 冰箱/键盘升级 | 设计 19.3；数值 5 | PARTIAL | `fridgeItemUseLimit` 存在，默认 3 | 没有设备等级、升级成本、键盘字数上限；默认应从 Lv1=1 开始 | 经济基础工单 |
| 抽卡重连 | 数值 6.1 | TODO | 目前固定从已解锁演员构造 roster | 200G 重连、退款、赔率重算、下注回滚未做 | 下注系统补完后做 |
| 节目变异液 | 数值 6.2 | TODO | 无 | 500G、随机 3 选 1、Prompt/开局场景/action 数值变异未做 | 先别给 mini 自由发挥 |
| 下注系统 | 数值 9 | PARTIAL | BettingPage、BetSlip、赛前扣本金、结算 payout 已有 | 赔率公式不按 preBattlePower 排名；最低/最高下注、二次确认、演员好感增加、重连退款未完整 | 经济基础工单 |
| 金币来源 | 设计 19.1；数值 3 | PARTIAL | 挂机、乞讨、赌博赢取都有骨架 | 挂机收益未按 Zog 好感等级；乞讨冷却当前 1 分钟，数值文档是 10 分钟；数值需对齐 | 经济参数对齐 |
| 金币消耗 | 设计 19.2；数值 3.4 | PARTIAL | 下注、商店、Zog 送礼、指令账单骨架存在 | 设备升级、演员礼物、重连、变异液、永久 Prompt 注入未做；指令费未实际扣金币 | 经济基础工单 |
| Zog 好感 | 设计 15；数值 4 | PARTIAL | Zog 送礼增加好感；客厅有显示 | 乞讨当前可能降低好感，需确认是否违反“Zog 好感只通过送礼提升”；聊天/陪看记录未做 | 先按源文档修正为只送礼提升 |
| Zog 陪看/吐槽 | 设计 15 | PARTIAL | 最终战报有 Zog reaction；客厅简单交互 | 战中吐槽、陪看记录、电视前存在感未做 | 可交给 UI/表现层 |
| 演员好感 A | 数值 7 | TODO | roster 有静态 `affection` 字段但没有账户 | 下注支持、演员礼物、等级、解锁内容、永久 Prompt 条件都未做 | 演员长期系统工单 |
| 演员礼物 | 设计 19.2；数值 7.2 | TODO | 无 | 礼物表、消费金币、增加演员好感、UI 未做 | 演员长期系统工单 |
| 演员片酬 S | 设计 16.4；数值 8 | TODO | `rewards.ts` 是玩家奖励，不是演员片酬 | 没有 actorSalary account、名次片酬、MVP +25S、入账、花名册显示、消费 | 必须先设计数据结构，不建议 mini 自由写 |
| S 币消费 | 数值 8.4 | TODO | 无 | 初级/高级/稀有外观、登场特效、永久 Prompt 注入消耗未做 | 片酬账户后做 |
| 演员永久 Prompt 注入 | 设计 16.3；数值 7.4 | TODO | 无 | 好感 Lv4、G+S 成本、30 字上限、规则校验、接入 ActorBrain prompt 都未做 | LLM/prompt 边界工单 |
| 演员通信终端 | 设计 16.6；数值 7.3 | LATER | 无 | 源文档低优先级长期功能 | 首发后做 |
| 战地记者单轮播报 | 设计 18；开发 Phase 8 | TODO | 只有 displayMapper 的普通事件文案 | 没有独立 WarReporter、阶段简报、毒舌短讯、羞辱记录 | 可做 deterministic v0，不能改状态 |
| 最终战报 | 设计 22；开发 Phase 8 | PARTIAL | finalReport、LLM reportGenerator、收藏页存在 | 演员片酬、关系变化、道具细目、玩家插手细节不完整；乱码文案需修 | 报告系统补完 |
| 节目账单 | 设计 22.3 | PARTIAL | 观看奖励、完整观看奖励、押注奖金、指令费、道具费用骨架 | 道具按次数粗算，不按真实道具消耗；演员收益/关系变化未展示 | 道具和 S 币后回填 |
| 战报收藏/回看 | 设计 22.4 | PARTIAL | 收藏列表和详情页有 | 回看不是 EventLog replay；账单可能丢失；收藏美术包装未做 | 后续表现层 |
| DisplayEvent / DisplayQueue 协议 | 设计 14、20；开发 7B | PARTIAL | DisplayItem 粗类型存在 | 协议未冻结，PIXI 不能稳定消费；缺动画 key、asset key、事件优先级 | PIXI 前必须冻结 |
| React 粗 UI | 开发 7A | PARTIAL | 客厅、下注、战斗、结果、商店、花名册、战报可跑 | 粗糙、乱码、失败提示少、信息层级弱 | 可交给 mini，但不改规则 |
| PIXI 美术管线 | 设计 20；开发 7C | TODO | 无正式 PIXI 接入 | AssetManifest、ActorSprite、stage renderer、动画状态机未做 | 你做美术时并行准备脚手架 |
| 多模型演员 | 设计 17.2 | TODO | 当前单 BYOK config 全局使用 | 每个演员不同模型未做，Reporter 模型分工未做 | 首发可先全局，后续扩 |
| 成本/延迟包装 | 设计 17.4 | TODO | LLM debug 有，UI 无 | 加载期间广告、雪花、战地记者短讯未做 | 表现层任务 |
| 测试覆盖 | 开发 3.5 | PARTIAL | 现有 59 个测试，覆盖 debug 和部分核心 | 很多源文档规则没有测试：S 币、道具限制、设备升级、数值公式、演员好感 | 每个新工单必须带测试 |

### 17.4 当前最大偏差清单

以下项目是“代码能跑但未按源文档”的重点风险，后续不要继续在错误骨架上扩功能：

1. `SceneState.totalDodos`：代码当前 20，数值文档是 100。
2. `ActorSceneState.dodoTrust`：代码当前开局 50，数值文档是 10。
3. 首发演员：代码当前不是数值文档 10 名演员，也没有数值文档的 HP/ATK/DEF/SPD/THREAT。
4. 伤害公式和 actionPower：代码当前简化实现，不是数值文档公式。
5. 赔率：代码当前按 threat share，数值文档要求按 preBattlePower 排名给固定赔率。
6. 道具表：代码当前 Small Bandage/Medical Kit 等，不是数值文档的劣质机油/急救罐头/高能嘲讽电池。
7. 指令计费：代码当前估算费用不是 20G/字，也没有键盘等级字数上限和真实金币扣费闭环。
8. Zog 好感：代码里乞讨可能降低好感，需要按“Zog 好感只通过送礼提升”重新确认并修正。
9. FinalScore：代码当前按 damage/kill/survival/special，数值文档强制结算公式是 HP + Dodos*2 + Trust + Nest*1.5，并且出局排名另算。
10. `rewards.ts` 命名有误导：当前是玩家战斗奖励，不是演员片酬 S。

### 17.5 更新后的开发顺序

当前不建议继续直接“加功能”。先按源文档做对齐，再补长线系统。

#### Phase A：数值文档对齐（优先级最高）

目标：把当前能跑骨架修正到源文档的数值语义。

任务：
- 对齐 `SceneState`：`totalDodos=100`、`wildDodos=100`。
- 对齐 `ActorSceneState`：`dodoTrust=10`、`nestInfluence=0`、`dodosControlled=0`。
- 替换首发演员表为数值文档 10 名演员。
- 对齐 `preBattlePower` 与赔率表。
- 对齐 FinalScore、排名、MVP。
- 对齐伤害公式和 actionPower。

不建议交给 mini 自由发挥。可以让 mini 写测试或替换静态数据，但核心公式由 Codex/人工确认。

#### Phase B：经济基础闭环

目标：金币、设备、下注、指令费不再只是 UI 骨架。

任务：
- 设备等级 store：Lv1-Lv5，共用升级树。
- 键盘字数上限：5/8/12/20/30 字。
- 冰箱每局道具次数：1/2/3/4/5 次。
- 升级成本：300/900/2500/7000 G。
- 指令费：20G/字，预审后扣费；ASK 免费；REJECT 首次免费，后续 30%。
- 下注最低 50G、最高 500G、二次确认、赔率锁定。
- 下注增加演员好感：floor(betAmount / 20)。
- 抽卡重连：200G、阵容重抽、下注退款和好感回滚。

mini 可做 UI 和测试；核心扣费状态机需要 Codex review。

#### Phase C：道具闭环

目标：把“能用道具”升级为“符合数值文档的节目道具系统”。

任务：
- 替换道具表：
  - 劣质机油：80G，恢复 20HP，20% 概率肠胃不适。
  - 急救罐头：150G，恢复 35HP。
  - 高能嘲讽电池：350G，恢复 60HP，获得 SHIELD_ONCE，并触发 TAUNT_1_ACTION。
- 救场类道具只能用于玩家本局支持演员。
- 同一名演员在自己两次行动之间最多被回血一次。
- 成功使用：库存 -1，itemUsesRemaining -1，写入 `ITEM_USED` EventLog。
- 失败使用：不扣库存，不扣次数，UI 显示 reason。
- 账单按真实道具消耗展示，不再按次数粗算固定价格。

mini 可以做 UI/文案/账单展示；CombatReferee/BattleEngine 规则必须 review。

#### Phase D：战地记者 v0

目标：先做不碰状态的 deterministic WarReporter，再考虑 LLM 风格化。

任务：
- 新增 `src/features/reports/warReporter.ts` 或 `src/features/battle/reporter/warReporter.ts`。
- 输入只允许 `BattleEvent + BattleState`。
- 输出只允许 DisplayItem/ReporterLine，不得修改 BattleState。
- 支持：
  - 单轮事件播报。
  - 出局播报。
  - 道具使用播报。
  - 玩家插手播报。
  - 阶段简报。
  - 羞辱记录和节目事故 tag。
- LLM WarReporter 只能作为润色层，不能编造 EventLog 不存在的事实。

这块可以交给 mini，但要严格禁止改 `core/battle` 和 `engine`。

#### Phase E：演员长期系统与 S 币

目标：演员片酬、演员好感和演员专属消费入账。

任务：
- 新增演员账户 store：
  - `actorSalaryById: Record<ActorId, number>`
  - `actorAffinityById: Record<ActorId, number>`
  - `actorOwnedCosmeticsById`
  - `actorPermanentPromptById`
- 结算演员片酬：
  - 第 1 名 60S。
  - 第 2 名 35S。
  - 第 3 名 20S。
  - 第 4 名 10S。
  - 第 5 名 0S。
  - MVP 额外 +25S，可叠加。
- 花名册显示每个演员 S 币、好感、等级、履历。
- 演员礼物用金币购买，提高演员好感。
- S 币只能花在该演员身上，不能转金币，不能转给其他演员。
- 初级外观 60S、高级外观 180S、稀有外观 400S。
- 永久 Prompt 注入：好感 Lv4，1000G + 200S 写入，30 字上限。

这块不建议 mini 从零设计。先由 Codex 写类型和规则测试，再拆 UI 给 mini。

#### Phase F：节目变异液

目标：实现“本局节目修饰”，不引入旧版全局硬字段。

任务：
- 500G 购买。
- 随机生成 3 个候选，必须选 1 个。
- 本局有效，不退款、不刷新、不跳过。
- 只允许影响：
  - Prompt 表演约束。
  - 开局演员场景数值。
  - 已有 actionType 的明确数值项。
- 禁止新增旧版全局字段，如环境压力、StormLevel、FoodSupply 等。

需要 Codex/人工先写白名单，mini 只能做 UI。

#### Phase G：DisplayEvent 冻结与 PIXI 接入

目标：让 React 粗 UI 和 PIXI 共用同一套表现协议。

任务：
- 冻结 `DisplayEvent` 字段：
  - eventId
  - actorActionIndex
  - kind
  - actorId
  - targetActorId
  - text
  - assetKey
  - animationKey
  - timing
  - metadata
- 新增 AssetManifest：
  - actor portrait
  - actor sprite sheet
  - animation key
  - item icon
  - reporter badge
  - Zog reaction asset
- PIXI 只消费 DisplayEvent，不读写 BattleState。
- React 粗 UI 保留作为调试 UI。

这块适合 mini 和美术并行施工。

### 17.6 mini 派工边界

mini 可以做：
- React 粗 UI 拆分、空状态、loading、错误提示。
- 战报/账单展示。
- deterministic WarReporter 的显示层。
- AssetManifest、PIXI 目录脚手架。
- 静态表替换，但必须严格照数值文档。
- 测试补充。

mini 不可以自由改：
- `src/llm/**`
- BYOK、proxy、token、prompt schema。
- `src/engine/battleEngine.ts`
- `src/core/battle/combatReferee.ts`
- `src/core/battle/finalScore.ts`
- 指令计费状态机。
- 演员片酬 S 账户设计。
- 新增任何数值规则或旧版全局字段。

### 17.7 下一批推荐工单

#### 工单 1：数值文档对齐扫描

输出一张差异表，不改代码。

范围：
- actors
- scene defaults
- actionPower
- damage formula
- FinalScore
- betting odds
- item table
- gold economy values

#### 工单 2：道具闭环 v1

先改道具表、支持演员限制、回血限制、失败提示、账单展示。

完成标准：
- 没下注支持对象时不能使用救场道具。
- 非支持演员不能被救场道具选中。
- 同一演员两次行动之间只能回血一次。
- 道具成功使用写 EventLog，并在战报/账单可见。

#### 工单 3：WarReporter v0

只消费 EventLog，不碰状态。

完成标准：
- 每个 `DAMAGE_DEALT`、`ACTOR_ELIMINATED`、`ITEM_USED`、`DIRECTOR_BROADCAST_INJECTED` 至少生成一条 reporter line。
- 不编造死亡、胜负、道具或金币变化。
- reporter line 可进入 DisplayLog。

#### 工单 4：演员片酬 S 账户设计

先写类型和测试，再写 UI。

完成标准：
- 每个 actorId 有独立 S 账户。
- 结算按名次和 MVP 入账。
- S 不能转金币，不能转给其他演员。
- 花名册可显示 S。

### 17.8 第一版不做清单

来自数值文档第 16 节，除非另行确认，以下不要让任何模型擅自实现：

- 演员负债。
- 演员随身战斗道具。
- 演员升级加属性。
- 演员好感提高抽取概率。
- 战中救援增加演员好感。
- 聊天增加 Zog 好感。
- 聊天增加演员好感。
- 节目效果分。
- 造成伤害发片酬。
- 战地记者点名发奖励。
- 复杂动态赔率。
- 跨演员转移片酬。
- 复杂每日任务。
- CRT 显示器升级。
- 电视天线升级。
- 收音机升级。
- 设备升级带来的战斗数值增强。
