# ZogV2 文档评估报告 & 开发计划

## 一、当前结论

本轮已根据开工口径重新同步 `V2设计文档`、`V2数值文档` 和 `战斗执行协议 v0.1`。

最新准绳如下：

1. `Zog V2 战斗执行协议 v0.1` 是战斗实现最高准绳。
2. `【Zog】V2_数值文档` 是经济、演员数值、道具、赔率和变异液准绳。
3. `【zog】V2_设计文档` 是世界观、体验目标、UI 气质和产品范围准绳。
4. 本审核文档只作为风险记录和开发计划，不再覆盖前三份文档。

## 二、已冻结口径

| 项目 | 最新决定 |
| --- | --- |
| activeActor | 由 BattleEngine 选择，BattleShowrunner 不选择真实行动演员 |
| target | 由 BattleEngine / TargetResolver 锁定，ActorBrain 只回显 targetEcho |
| 玩家上帝指令 | 通过 CommandGate 后生成自然语言 directorBroadcast |
| Prompt 注入 | directorBroadcast 必须作为 ActorBrain 业务提示词第一段拼接 |
| 硬状态边界 | 玩家指令不直接改 HP、金币、状态、胜负、渡渡鸟池或演员场景数值 |
| 过时全局字段 | 不再使用旧版全局硬字段 |
| 过时自动升压机制 | 删除，不进入首发设计 |
| 冰箱 | 决定每局比赛的道具使用次数，不做战前携带 UI |
| 战中购买 | 禁止战中临时购买道具 |
| @质问 | 免费功能入口；输入内容按上帝指令字数计费，按钮选人不计费 |
| BYOK | 首发保留，复用 V1 已实现能力并接入 ActorBrain 调用 |
| 节目变异液 | 首发保留，但不得引入过时全局硬字段 |
| STEAL_DODOS | 目标不足 5 只时，最多从 WildDodos 补 2 只 |
| Zog 好感 | 只通过送礼提升，聊天/陪伴只解锁表现和记录 |

## 三、剩余风险

### 高风险

| # | 风险点 | 说明 | 建议 |
| --- | --- | --- | --- |
| R1 | 异步指令队列 | 玩家随时输入、自动/暂停/手动、LLM 生成、Display 播放会并行交错 | Phase 1 优先实现 CommandTransaction、stateVersion、generationId 和安全点 |
| R2 | directorBroadcast 生命周期 | 广播事实需要知道谁已回应、何时过期、目标出局后如何处理 | 按协议实现 broadcastId、scope、targetActorIds、expiresAtActionIndex、reactedActorIds |
| R3 | BYOK 失败兜底 | 首发保留 BYOK，但不同模型超时、失败、输出非法仍会发生 | ActorBrain 调用必须有 20 秒超时、repair once 和 fallback action |
| R4 | 行动表一致性 | Prompt、Validator、CombatReferee 如果各写一套规则会漂移 | 使用协议里的 ACTION_DEFS 作为唯一行动定义表 |

### 中风险

| # | 风险点 | 说明 | 建议 |
| --- | --- | --- | --- |
| M1 | Showrunner 越权 | LLM 导演容易在文案中暗示选人、换目标或改数值 | Prompt 明写“不决定 activeActor / target / 数值 / 胜负” |
| M2 | 变异液越界 | 变异液若直接改不存在的全局字段，会把旧设计带回来 | 只允许 Prompt 约束、开局演员场景数值、已有 actionType 明确数值项 |
| M3 | 道具使用次数 | 冰箱改为使用次数后，需要清楚区分库存数量和本局次数 | 战斗状态记录 `itemUsesRemaining`，成功使用时库存 -1 且次数 -1 |
| M4 | 随机复现 | 战斗回看和调试需要稳定随机 | 统一使用 `seededRng(battleSeed, actorActionIndex, namespace, actorId, targetId)` |

## 四、开发计划

### Phase 0：文档冻结

- [x] 删除过时自动升压机制相关设计
- [x] 删除旧版全局硬字段
- [x] 统一 BattleShowrunner 不选 activeActor
- [x] 统一冰箱为本局道具使用次数
- [x] 补充 ACTION_DEFS 和 directorBroadcast 字段
- [x] 修正文档编号和过时示例

### Phase 1：核心战斗架构

| 优先级 | 模块 | 说明 |
| --- | --- | --- |
| P0 | BattleEngine v2 | 安全点、stateVersion、generationId、AUTO/MANUAL/PAUSED |
| P0 | TargetResolver | 真实目标锁定、TAUNT 优先级、稳定随机 |
| P0 | ActionPolicy | 基于 ACTION_DEFS 生成 allowedActionTypes |
| P0 | PlayerCommandGate | ALLOW / ASK / DOWNGRADE / REJECT，生成 directorBroadcast |
| P0 | ActorBrain | BYOK 接入、结构化输出、repair once、fallback |
| P0 | CombatReferee | 9 种 actionType 硬编码结算、状态生命周期、终局 |
| P1 | BattleShowrunner | Beat 选择、镜头理由、导演约束，不越权 |
| P1 | WarReporter | 单轮播报、最终战报、玩家插手记录 |

### Phase 2：荒岛渡渡鸟频道

| # | 子任务 |
| --- | --- |
| 2.1 | 5 名演员抽取、重连、赔率生成 |
| 2.2 | 下注和支持对象锁定 |
| 2.3 | 节目变异液三选一 |
| 2.4 | SceneState 初始化：totalDodos=100, wildDodos=100 |
| 2.5 | ActorSceneState 初始化：dodosControlled=0, dodoTrust=10, nestInfluence=0 |
| 2.6 | 9 种荒岛行动结算 |
| 2.7 | 道具使用次数和库存消耗 |
| 2.8 | 40 次 Actor Action、存活胜利、全员失败、FinalScore |

### Phase 3：客厅与经济闭环

| # | 子任务 |
| --- | --- |
| 3.1 | 客厅空间主界面 |
| 3.2 | 挂机收益 |
| 3.3 | Zog 乞讨冷却 |
| 3.4 | 设备升级：键盘字数 + 冰箱使用次数 |
| 3.5 | 战斗道具、Zog 礼物、演员礼物商店 |
| 3.6 | 演员花名册、片酬和好感复用 |

### Phase 4：表现与回看

| # | 子任务 |
| --- | --- |
| 4.1 | Zog 战斗前景 |
| 4.2 | Zog 吐槽和误触 Beat |
| 4.3 | DisplayQueue 渐显和事件播报 |
| 4.4 | 战报和节目账单 |
| 4.5 | 战斗 EventLog 回看 |

## 五、低优先级内容

以下不进入首发：

1. 更多频道
2. 复杂客厅装修
3. 大量外观槽
4. 深度星球溜达
5. 复杂悬赏任务
6. 演员负债系统
7. 演员随身战斗道具
8. 复杂动态赔率
9. 节目效果分
10. 旧版全局硬字段

## 六、开工判断

当前文档已经可以进入实现。关键是先把 BattleEngine、CommandTransaction、ACTION_DEFS、ActorBrain Validator、CombatReferee 这条链路跑通。只要这条链路稳定，Zog V2 的首发战斗就不会被 LLM 输出、玩家插播或 UI 播放状态拖乱。
