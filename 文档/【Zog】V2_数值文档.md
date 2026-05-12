**

# 《Zog V2：Alien TV》第一版数值策划案

## 1. 数值设计原则

第一版数值目标是做一个稳定、可查、适合 vibecoding 落地的节目经济系统。

本版数值只保留少量资源、少量来源、少量消耗、少量核心字段。任何需要新增复杂统计字段、复杂跨系统联动或难以排查数据流的系统，不进入第一版。

核心原则如下：

金币来源必须少。

金币消耗必须清楚。

片酬来源必须少。

演员好感不加战斗数值。

Zog 好感只通过送礼提升。

玩家上帝指令不直接影响数值。

战斗数值由代码硬编码结算。

渡渡鸟池和演员场景数值必须能被清楚展示。

赌博系统是第一版主要风险玩法。

设备升级只影响上帝指令字数和战斗道具使用次数。

---

## 2. 核心资源总览

### 2.1 全局金币 G

金币属于玩家。

金币用于下注、购买战斗道具、购买 Zog 礼物、升级设备、购买演员礼物、抽卡重连、购买节目变异液、支付上帝指令文本费用和演员永久 Prompt 注入。

金币是第一版最主要的全局资源。

### 2.2 演员片酬 S

片酬属于演员。

每个演员拥有独立片酬账户。

玩家可以在花名册中使用某个演员自己的片酬，为该演员购买外观、登场特效、永久注入等演员专属内容。

演员片酬不能转给其他演员，也不能兑换为玩家金币。

### 2.3 Zog 好感 Z-Affinity

Zog 好感属于 Zog。

Zog 好感只通过送礼提升。

Zog 好感用于解锁聊天 Prompt、提高客厅挂机金币效率、提高找 Zog 乞讨收益。

### 2.4 演员好感 A-Affinity

演员好感属于玩家和单个演员之间的关系。

演员好感只通过下注支持和金币送礼提升。

演员好感不提升 HP、ATK、DEF、SPD、THREAT。

演员好感用于解锁海报、外观槽、永久 Prompt 注入、通信终端。

---

## 3. 金币循环

### 3.1 金币来源

当前实机金币来源以代码为准，正式玩法来源包括挂机、乞讨、赌博获胜和节目结算奖励。

> 开发工具说明：客厅中的 `Cheat +5000G / 全员 +300S` 是开发调试入口，不属于正式经济来源，后续上线前删除。

|          |                                |      |
| -------- | ------------------------------ | ---- |
| 来源       | 说明                             | 是否首发 |
| 客厅挂机     | 玩家停留在客厅时自动获得金币，收益受 Zog 好感影响    | 是    |
| 找 Zog 乞讨 | 每隔一段时间可向 Zog 乞讨金币，收益受 Zog 好感影响 | 是    |
| 赌博获胜     | 玩家下注演员胜出后获得赔率回报                | 是    |
| 观看奖励     | 战斗结算账单固定发放 Viewing reward 10G      | 是    |
| 完整节目奖励   | 达到 40 次 Actor Action 时额外发放 Full episode reward 5G | 是 |

### 3.2 客厅挂机收益

按现实时间结算。

建议每 60 秒结算一次，避免过高频写入。

|          |          |
| -------- | -------- |
| Zog 好感等级 | 挂机收益     |
| Lv1      | 2 G / 分钟 |
| Lv2      | 3 G / 分钟 |
| Lv3      | 4 G / 分钟 |
| Lv4      | 5 G / 分钟 |
| Lv5      | 7 G / 分钟 |

设计目标：挂机是低保，不是暴富点。

### 3.3 找 Zog 乞讨

冷却时间：10 分钟。

乞讨收益为随机区间。

|          |             |
| -------- | ----------- |
| Zog 好感等级 | 乞讨收益        |
| Lv1      | 20 - 40 G   |
| Lv2      | 35 - 60 G   |
| Lv3      | 55 - 85 G   |
| Lv4      | 80 - 120 G  |
| Lv5      | 120 - 180 G |

乞讨文案应保持 Zog 外星生物气质。

示例：

“Zog 从沙发缝里掏出一把疑似硬币的金属片。”

“Zog 认真地把电视遥控器背后的电池盖卖给了你。”

### 3.4 金币消耗

第一版金币消耗保留9类。

|             |                    |      |
| ----------- | ------------------ | ---- |
| 消耗项 | 说明 | 是否首发 |
| 下注本金 | 赌博系统核心消耗 | 是 |
| 战斗道具 | 战中救场与节目干预 | 是 |
| Zog 礼物 | 提升 Zog 好感 | 是 |
| 演员礼物 | 提升演员好感 | 是 |
| 设备升级 | 提升上帝指令字数上限和本局道具使用次数 | 是 |
| 抽卡重连 | 重新抽取本期演员 | 是 |
| 节目变异液 | 进入战斗前选择本期节目变异 | 是 |
| 上帝指令文本费用 | 每个有效计数字消耗 20 G | 是 |
| 演员永久 Prompt 注入 | 解锁后写入或修改长期演员设定 | 是 |

**@质问**：免费功能入口，不额外收道具费；输入内容仍按上帝指令字数计费，按钮选人不计费。

---

## 4. Zog 好感数值

### 4.1 Zog 好感来源

Zog 好感只通过送礼提升。

聊天、观看节目、战报、战斗胜负不直接增加 Zog 好感。

### 4.2 Zog 礼物

|               |       |          |                |
| ------------- | ----- | -------- | -------------- |
| 礼物            | 价格    | Zog 好感增加 | 文案方向           |
| 过期星际薯片        | 50 G  | +10      | Zog 觉得这很高级     |
| 发光罐头          | 150 G | +35      | Zog 不确定这是食物还是灯 |
| RTX 4090 显卡蛋糕 | 500 G | +130     | Zog 认为吃了会变聪明   |

### 4.3 Zog 好感等级

|     |        |                    |          |             |
| --- | ------ | ------------------ | -------- | ----------- |
| 等级  | 所需累计好感 | 解锁内容               | 挂机收益     | 乞讨收益        |
| Lv1 | 0      | 基础聊天 Prompt        | 2 G / 分钟 | 20 - 40 G   |
| Lv2 | 100    | 解锁更多日常聊天反应         | 3 G / 分钟 | 35 - 60 G   |
| Lv3 | 300    | 解锁节目吐槽 Prompt      | 4 G / 分钟 | 55 - 85 G   |
| Lv4 | 700    | 解锁 Zog 误触事件池       | 5 G / 分钟 | 80 - 120 G  |
| Lv5 | 1500   | 解锁高级陪伴 / 专注 Prompt | 7 G / 分钟 | 120 - 180 G |

### 4.4 设计说明

Zog 好感只影响客厅收益和 Zog 表现，不直接影响演员战斗数值。

Zog 是外星生物，所以送礼是最清晰、最稳定、最符合设定的好感来源。

---

## 5. 设备升级数值

### 5.1 设备升级范围

第一版设备升级只保留两个设备。

**两个设备共用一个升级树，升级一次，冰箱和破旧键盘会一起升级。**

**破旧键盘**：影响玩家上帝指令字数上限。默认拥有，升级后在客厅打开可输入更长的指令。

**冰箱**：相当于背包，在客厅打开后展示所有道具。升级后每局比赛可使用战斗道具的次数增加。默认拥有。

> **定义说明**：冰箱升级后增加的是"本局道具使用次数上限"。首发不做战前携带 UI，不做携带清单判断；战斗中禁止临时购买，道具必须来自战前已购买库存。

其他设备不进入第一版数值系统。

### 5.2 设备升级成本

破旧键盘和冰箱使用同一套升级成本。升级一次，冰箱和破旧键盘会一起升级。

|      |        |
| ---- | ------ |
| 目标等级 | 升级消耗   |
| Lv1  | 默认拥有   |
| Lv2  | 300 G  |
| Lv3  | 900 G  |
| Lv4  | 2500 G |
| Lv5  | 7000 G |

### 5.3 破旧键盘

定位：影响玩家上帝指令输入长度。

**收费流程**：
- 输入时：前端显示预估费用，例如"本条7字，预计140G"
- 提交时：创建CommandTransaction，进入QUEUED，**不立刻扣费**
- 预审后：
  - **ALLOW**：扣全额，生成 directorBroadcast
  - **DOWNGRADE**：扣全额，但UI明确提示"信号太差，已降级成节目事故"
  - **ASK**：不扣费，进入WAITING_CLARIFICATION，玩家点按钮后重新计算最终文本费用
  - **REJECT**：扣30%手续费，返还70%；V2首发放宽：**首次REJECT不扣费**，之后扣30%

每个字消耗20G。收费要在预审之后。如果指令被拒绝则扣掉30%手续费后返还，G取整数。

|     |          |
| --- | -------- |
| 等级  | 上帝指令字数上限 |
| Lv1 | 5 字      |
| Lv2 | 8 字      |
| Lv3 | 12 字     |
| Lv4 | 20 字     |
| Lv5 | 30 字     |

设计说明：

上帝指令必须短，越短越像电视前的离谱插播。

字数上限只影响玩家表达空间，不直接提高指令成功率，不直接增强战斗数值。

### 5.4 冰箱

定位：在客厅打开相当于背包，升级后可在战斗中使用更多次道具。默认拥有。

|     |                |
| --- | -------------- |
| 等级  | 每局最多使用战斗道具次数 |
| Lv1 | 1 次     |
| Lv2 | 2 次     |
| Lv3 | 3 次     |
| Lv4 | 4 次     |
| Lv5 | 5 次     |

---

### 5.5 CommandGate 完整输出

CommandGate 预审玩家上帝指令后输出：

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

export interface DirectorBroadcast {
  broadcastId: string;
  text: string; // 自然语言节目事实，不是枚举事件
  scope: 'GLOBAL' | 'TARGETED';
  targetActorIds: string[];
  lifetime: 'NEXT_ACTION' | 'CURRENT_BEAT';
  expiresAtActionIndex: number;
  reactedActorIds: string[];
  sourceTransactionId: string;
}
```

**关键约束**：
- CommandGate只判断：能否进入节目世界 / 是否越权 / 是否缺目标 / 是否要降级
- directorBroadcast是自然语言，不指定具体数值变化
- directorBroadcast.text 必须作为 ActorBrain 业务提示词第一段拼接
- CombatReferee不读取directorBroadcast做数值结算
- ActorBrain根据directorBroadcast改变行动表达，但actionType必须来自allowedActionTypes

### 5.6 CommandTransaction 状态机

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

**流转**：
```
玩家提交 → QUEUED → JUDGING
  ↓
ALLOW → READY_TO_INJECT
ASK → WAITING_CLARIFICATION → READY_TO_INJECT / CANCELLED
DOWNGRADE → READY_TO_INJECT
REJECT → REJECTED
模型失败/解析失败 → SYSTEM_FAILED_REFUND
```

**计费规则**：
- ALLOW/DOWNGRADE：扣全额
- ASK：不扣费直到选择目标
- REJECT首次免费，后续扣30%
- 节目结束未注入：全额退款


## 6. 抽卡重连与节目变异液

### 6.1 抽卡重连

每局节目开播前，系统抽取 5 名演员。

玩家可以消耗金币重新抽取本期演员。

抽卡重连次数不限。

每次抽卡重连固定消耗：200 G。

抽卡重连只影响本期演员阵容，不影响演员好感、赔率规则和片酬规则。

### 6.2 节目变异液

玩家可以不购买节目变异液，直接以无变异状态进入战斗。

如果玩家选择购买节目变异液，则支付 500G 后随机生成 3 个候选；玩家必须从 3 个候选中选择 1 个，本局节目获得该变异效果。

购买后不可退款，不可刷新，不可跳过选择。

节目变异只影响本局。

第一版建议变异示例：

|       |                                  |
| ----- | -------------------------------- |
| 变异    | 效果                               |
| 全员结巴  | 演员台词必须出现结巴表现，不改数值                |
| 低预算暴雨 | 作为 directorBroadcast 注入，演员必须承认下雨，不改硬状态 |
| 假巢热潮  | BUILD_FAKE_NEST 的 nestInfluence 增量 +5 |
| 渡渡鸟警觉 | 所有演员开局 dodoTrust -3 |
| 巢区黄金档 | CLAIM_NEST_AREA 的 activeActor nestInfluence 增量 +4 |
| 麦克风漏音 | 每个 ActorBrain Prompt 追加“节目组麦克风漏音，演员更容易被当场拆穿”的表演约束，不改数值 |

> **变异边界**：首发变异不得引入旧版全局硬字段。变异只能影响 Prompt 包装、开局演员场景数值或已有 actionType 的明确数值项。

---

## 7. 演员好感数值

### 7.1 演员好感来源

演员好感只来自两种行为。

|      |                           |
| ---- | ------------------------- |
| 来源   | 计算方式                      |
| 下注支持 | 演员好感增加 = floor(下注本金 / 20) |
| 演员送礼 | 根据礼物价格增加固定好感              |

下注无论胜负，都会增加该演员好感。因为玩家已经为该演员投入了本金。

### 7.2 演员礼物

|       |       |        |                 |
| ----- | ----- | ------ | --------------- |
| 礼物    | 价格    | 演员好感增加 | 文案方向            |
| 廉价粉丝牌 | 100 G | +10    | “你现在也是有人举牌的演员了” |
| 霓虹花篮  | 350 G | +35    | 低成本电视台的高级礼物     |
| 金主横幅  | 800 G | +100   | 强行把演员包装成台柱子     |

### 7.3 演员好感等级

|          |      |                |
| -------- | ---- | -------------- |
| 等级       | 累计好感 | 解锁内容           |
| Lv1 路人   | 0    | 基础资料查看         |
| Lv2 铁粉   | 150  | 解锁客厅海报         |
| Lv3 金主   | 500  | 解锁外观槽 1        |
| Lv4 带资进组 | 1200 | 解锁永久 Prompt 注入 |
| Lv5 通信对象 | 3000 | 解锁通信终端         |

### 7.4 永久 Prompt 注入

解锁条件：演员好感 Lv4。

写入成本：1000 G + 200 S。

修改成本：1500 G + 200 S。

清除成本：1000 G。

永久 Prompt 字数上限：30 中文字。

永久 Prompt 不允许推翻战斗规则，不允许要求演员无敌、必胜、免伤、拒绝输出结构化行动。

### 7.5 演员好感边界

演员好感不提高抽到概率。

演员好感不提高 HP、ATK、DEF、SPD、THREAT。

演员好感不影响赔率。

演员好感不影响片酬发放。

演员好感只解锁长期内容和个性化包装。

---

## 8. 演员片酬数值

### 8.1 片酬来源

演员片酬只通过节目结算获得。

第一版只保留两个片酬来源：节目名次和 MVP。

### 8.2 名次片酬

默认每局 5 名演员参演。

|       |      |
| ----- | ---- |
| 名次    | 片酬（S）  |
| 第 1 名 | 60 S |
| 第 2 名 | 35 S |
| 第 3 名 | 20 S |
| 第 4 名 | 10 S |
| 第 5 名 | 0 S  |

**注：S = 片酬（Salary），演员专属货币，不可兑换为金币。**

### 8.3 MVP 片酬

MVP 判定：本局 totalDamageDealt 最高的演员。

MVP 额外获得：25 S。

**叠加规则**：MVP 奖励与名次片酬叠加计算。例如，第 1 名获得 60 S，同时是 MVP 再 +25 S，共计 85 S。

### 8.4 片酬消耗

|                |       |      |
| -------------- | ----- | ---- |
| 消耗项            | 价格    | 优先级  |
| 初级外观           | 60 S  | 首发   |
| 高级外观           | 180 S | 首发可做 |
| 稀有外观           | 400 S | 后置   |
| 登场特效           | 300 S | 低优先级 |
| 永久 Prompt 注入消耗 | 200 S | 首发可做 |

### 8.5 不进入第一版的片酬设计

演员负债不进入第一版。

演员随身战斗道具不进入第一版。

节目效果提成不进入第一版。

造成伤害发片酬不进入第一版。

战地记者点名发片酬不进入第一版。

---

## 9. 赌博系统

### 9.1 定位

赌博是第一版的主要风险玩法，也是金币暴富点。

玩家在节目开始前选择一名演员下注。下注对象即为本局玩家支持对象。

### 9.2 下注规则

下注前有二次确认。

确认下注后不可取消、不可修改。

如果玩家在开播前抽卡重连，当前下注自动取消并全额返还，演员好感增量回滚。

战斗开始后下注锁定。

最低下注：50 G。

最高下注：500 G。

玩家输入的任意整数，在范围内即可（无需倍数限制）。

下注后立刻扣除金币。

下注演员胜出后，按赔率返还。

下注演员失败，本金归零。

下注会增加该演员好感。

### 9.3 赔率生成

第一版赔率根据本局 5 名演员的赛前综合战力排名生成。

赛前综合战力公式：

preBattlePower = HP + ATK * 3 + DEF * 5 + SPD * 4 - THREAT * 2

将本局 5 名演员按 preBattlePower 从高到低排序。

|       |      |
| ----- | ---- |
| 战力排名  | 赔率   |
| 第 1 名 | x1.5 |
| 第 2 名 | x2.0 |
| 第 3 名 | x2.8 |
| 第 4 名 | x3.8 |
| 第 5 名 | x5.0 |

返还公式：

payout = floor(betAmount * odds)

profit = payout - betAmount

### 9.4 演员好感增加

下注时立即增加演员好感：

actorAffinityGain = floor(betAmount / 20)

例如下注 500 G，该演员好感 +25。

胜负不额外增加好感，避免新增结算分支。

### 9.5 设计说明

押弱者赔率更高，但胜率更低。

玩家会因为下注而更想在战中救场。

赌博系统和战斗道具共同制造“我已经投钱了，不能让他死”的沉没成本。

---

## 10. 战斗道具数值

### 10.1 道具购买与使用

战斗道具使用金币购买。

冰箱等级决定每局比赛可使用道具的次数。

道具购买后进入玩家库存。

战斗中只能使用库存中已有的道具，不能临时购买。

首发不做战前携带 UI。每次成功使用道具时，消耗 1 个库存道具，并消耗 1 次本局道具使用次数。

### 10.2 道具表

| 道具     | 代码 ID | 价格    | 效果                     | 副作用 / 限制                                       |
| ------ | ------ | ----- | ---------------------- | ---------------------------------------------- |
| 口袋冷却包 | HEAL_TINY | 45 G | 目标演员恢复 10 HP           | 无副作用                                           |
| 劣质机油   | HEAL_SMALL | 80 G  | 目标演员恢复 20 HP           | 20% 概率获得”肠胃不适”，下一次行动无法攻击                       |
| 急救罐头   | HEAL_MEDIUM | 150 G | 目标演员恢复 35 HP           | 无副作用                                           |
| 原型涌流罐 | HEAL_GAMBLE | 260 G | 尝试恢复 100 HP             | 35% 概率失败，失败时不恢复 HP                         |
| 高能嘲讽电池 | SHIELD_GRANT | 350 G | 目标演员恢复 60 HP，并获得 1 次护盾 | 目标获得 TAUNT_1_ACTION 状态，下 1 次行动前被其他演员优先攻击     |
| TAUNT状态 | - | -     | 触发后被强制指定为攻击目标         | 代码强制处理，不交给 AI 理解，actorStatus 类型之一              |

**actorStatus 类型**：SHIELD_ONCE、TAUNT_1_ACTION、”肠胃不适”等。

### 10.3 HP 恢复限制

所有回血不能超过 maxHP。

同一名演员每 1 次行动间隔内最多被使用 1 个回血道具。

高能嘲讽电池的 TAUNT 由代码强制处理，不交给 AI 自行理解。

---

## 11. 演员基础数值

### 11.1 字段说明

| 字段 | 含义 |
|------|------|
| HP | 演员节目生命线，归零出局。**maxHP = 演员开局HP，节目内不变** |
| ATK | 攻击能力，影响伤害 |
| DEF | 防御能力，降低承伤 |
| SPD | 速度/镜头权重，影响行动顺序，SPD越高越容易获得行动机会 |
| THREAT | 威胁度，影响被攻击概率，越高越容易被针对 |

> **maxHP定义**：maxHP等于演员开局HP，节目内固定不变。所有回血不能超过maxHP。

### 11.2 10 名首发演员

|                 |                 |                   |     |     |     |     |        |                |
| --------------- | --------------- | ----------------- | --- | --- | --- | --- | ------ | -------------- |
| ID              | 名字              | 定位                | HP  | ATK | DEF | SPD | THREAT | preBattlePower |
| tdog            | T-Dog           | 愤世嫉俗的哲学狗，嘴狠但容易拉仇恨 | 110 | 18  | 8   | 6   | 22     | 184            |
| cybercat        | Cybercat        | 赛博猫，速度快、攻击高、很招打   | 90  | 21  | 5   | 9   | 24     | 166            |
| nanobot         | Nanobot         | 纳米机器人，防御高、低调、稳定   | 75  | 14  | 12  | 7   | 10     | 185            |
| dodo_bishop     | Dodo Bishop     | 渡渡鸟神父，血厚、防御稳定     | 120 | 12  | 10  | 4   | 12     | 198            |
| glitch_witch    | Glitch Witch    | 故障女巫，高攻击、高风险      | 80  | 22  | 4   | 8   | 28     | 142            |
| astro_toad      | Astro Toad      | 宇航蛤蟆，血厚但行动慢       | 130 | 10  | 9   | 3   | 8      | 201            |
| sofa_mimic      | Sofa Mimic      | 沙发拟态怪，极能苟，速度很慢    | 115 | 15  | 11  | 2   | 6      | 211            |
| neon_crab       | Neon Crab       | 霓虹螃蟹，均衡型，适合新手押注   | 100 | 17  | 9   | 5   | 18     | 180            |
| blob_accountant | Blob Accountant | 果冻会计，防御强、威胁低      | 95  | 13  | 13  | 4   | 4      | 207            |
| tian_yake       | 天涯客             | 很帅的一个男人，美强惨，会被怜爱  | 85  | 20  | 7   | 10  | 30     | 160            |

### 11.3 设计说明

T-Dog、Cybercat、Nanobot 为 V1 元老演员，必须首发保留。

preBattlePower 只用于赛前赔率，不直接用于战斗。

THREAT 高的演员更容易被攻击，因此高 ATK / 高 SPD 演员通常会有较高 THREAT。

---

## 12. 荒岛渡渡鸟场景数值

### 12.1 全局场景状态 SceneState

```ts
export interface SceneState {
  totalDodos: number;   // 固定 100
  wildDodos: number;    // 0 - totalDodos
}
```

默认值：

| 变量 | 初始值 | 范围 |
|------|--------|------|
| totalDodos | 100 | 固定 |
| wildDodos | 100 | 0 - totalDodos |

**渡渡鸟守恒规则**：`sum(actor.scene.dodosControlled) + wildDodos <= totalDodos`

首发不设置旧版全局硬字段。相关节目氛围只能作为导演广播、Drama Beat 或播报包装出现。

### 12.2 演员场景状态 ActorSceneState

```ts
export interface ActorSceneState {
  dodosControlled: number;  // 该演员控制的渡渡鸟数量
  dodoTrust: number;        // 鸟群对该演员的信任
  nestInfluence: number;    // 巢区影响力
}
```

> **命名说明**：统一使用 `nestInfluence`（巢区影响力），不是 `NestControl`。首发不使用"食物持有""鸟群仇恨""荒岛名声"作为硬状态。

每名演员开局：

| 变量 | 初始值 | 范围 |
|------|--------|------|
| dodosControlled | 0 | 0 - totalDodos |
| dodoTrust | 10 | 0 - 100 |
| nestInfluence | 0 | 0 - 100 |

---

## 13. 荒岛行动结算表

### 13.1 伤害公式与行动顺序

**行动顺序**：每回合只有1个演员行动（主行动者）。基于候选池分数选择activeActor。

**基础伤害公式**：

```
damage = clamp(
  round((max(0, attacker.ATK * actionPower - defender.DEF)) * randomRange(0.85, 1.15, battleSeed, actorActionIndex, actionType, attacker.actorId, defender.actorId)),
  1,
  35
)
```

其中 actionPower 由行动类型决定。

所有随机必须使用可复现随机源：

```
seededRng(battleSeed, actorActionIndex, namespace, actorId, targetId)
```

### 13.2 行动类型

**target 参数说明**：目标由 BattleEngine 在生成行动前通过 Actor Brain 的 API Payload 动态拼装，强制注入类似 `[SYSTEM RULE: 你本轮行动必须将 <强锁目标> 作为主要交互对象]` 的指令，确保 LLM 生成的台词意图与裁判底层的索敌完全一致。

Actor Brain 只输出 actionType，真实数值变化由代码表处理。

| 行动     | actionType                 | actionPower | 数值效果                                                                 |
| ------- | -------------------------- | ----------- | ----------------------------------------------------------------------- |
| 嘲讽管理能力 | MOCK_ANIMAL_MANAGEMENT     | 0.8         | 对目标造成伤害；目标 THREAT +2                                                   |
| 偷走鸟群   | STEAL_DODOS                | 0.8         | 对目标造成伤害；从目标处偷最多 5 只渡渡鸟，若目标不足则最多从 WildDodos 补 2 只            |
| 食物贿赂   | BRIBE_DODOS_WITH_FOOD      | 0           | 不造成伤害；从 WildDodos 吸引最多 8 只；自己 DodosControlled +实际吸引数量；自己 DodoTrust +6     |
| 伪造鸟巢   | BUILD_FAKE_NEST            | 0           | 不造成伤害；自己 nestInfluence +10                                      |
| 嫁祸对手虐鸟 | FRAME_TARGET_AS_DODO_ENEMY | 1.0         | 对目标造成伤害；目标 DodoTrust -6；目标 THREAT +4                      |
| 吓唬鸟群   | SCARE_HERD                 | 1.1         | 对目标造成伤害；目标 DodoTrust -2                                        |
| 引发踩踏   | TRIGGER_STAMPEDE           | 1.3         | 对目标造成较高伤害；自己 THREAT +5                                     |
| 安抚鸟群   | CALM_HERD                  | 0           | 不造成伤害；自己 DodoTrust +5                                       |
| 抢占巢区   | CLAIM_NEST_AREA            | 0.7         | 对目标造成伤害；自己 nestInfluence +8；目标 nestInfluence -5                                 |

### 13.3 行动边界

所有渡渡鸟池和演员场景数值变化必须 clamp 到合法范围。

不造成伤害的行动仍然可以改变渡渡鸟控制、鸟群信任或巢区影响力。

---

## 14. 胜负结算

### 14.1 终局条件

节目因以下情况结束：

| 条件 | 说明 |
|------|------|
| 只剩1名演员存活 | 存活演员获胜 |
| 达到40次Actor Action | 强制结算，按FinalScore排名 |
| 特殊环境事件导致全员失败 | 所有演员HP归零或全部失去行动能力 |

> **说明**：40次上限是"强制结算触发条件"，不是"直接结束"。达到40次后仍有多人存活时，按FinalScore公式计算排名。终局条件之间是"或"关系，满足任一条件即结束。

### 14.2 上限胜负公式

如果达到 40 次 Actor Action 时仍有多人存活，计算 FinalScore（所有值取整）。

finalScore = floor(currentHP) + floor(DodosControlled * 2) + floor(DodoTrust) + floor(nestInfluence * 1.5)

FinalScore 最高者胜出。

### 14.3 排名规则

优先按胜者确定第 1 名。

其余存活演员按 FinalScore 排名。

已出局演员按出局顺序倒序排名，越晚出局排名越高。

### 14.4 MVP 判定

MVP = 本局 totalDamageDealt 最高的演员。

如果最高伤害并列，优先排名更高者。

---

## 15. 具体数据流向示例

### 15.1 开局

系统抽取 5 名演员。

系统读取演员基础数值。

计算 preBattlePower。

生成赔率。

玩家下注 300 G 给 T-Dog。

金币变化：玩家金币 -300 G。

演员好感变化：T-Dog 好感 + floor(300 / 20) = +15。

### 15.2 节目初始化

sceneVars = {

  totalDodos: 100,

  wildDodos: 100,

}

每名演员初始化：

actorSceneVars = {

  dodosControlled: 0,

  dodoTrust: 10,

  nestInfluence: 0

}

### 15.3 演员行动

Cybercat 使用 STEAL_DODOS 攻击 T-Dog。

裁判结算：

damage = calcDamage(Cybercat.ATK, TDog.DEF, 0.8)

TDog.HP -= damage

Cybercat.DodosControlled += 5

TDog.DodosControlled -= min(TDog.DodosControlled, 5)

如果 T-Dog 不足 5 只鸟可偷，则最多从 WildDodos 中补 2 只：

WildDodos -= min(2, 缺口, WildDodos)

Cybercat.DodosControlled += 实际补足数量

### 15.4 玩家输入

**正确理解**：玩家指令 → CommandGate → directorBroadcast（自然语言节目事实）→ 安全点注入Actor Brain Prompt → Actor Brain生成行动与台词 → CombatReferee硬结算 → Reporter播报

CommandGate只负责判断：
- 能否进入节目世界
- 是否越权
- 是否缺目标
- 是否要降级

**示例**：
```
玩家输入：“下雨了。”
预审结果：ALLOW
directorBroadcast：荒岛开始下雨。下一位行动演员必须承认这场雨，并让自己的台词、动作或行动选择受到影响。

下一次安全点，directorBroadcast 作为 Actor Brain 业务提示词第一段注入。

Actor Brain生成行动与台词（如“该死，这雨把食物都泡湿了”）。

CombatReferee 根据实际 actionType 硬编码结算。下雨本身不直接改任何硬状态。

Reporter包装播报。
```

> **说明**：CommandGate输出的是自然语言节目事实，不是枚举事件。具体的数值变化由CombatReferee根据Actor Brain生成的actionType硬结算，不是预判的。

### 15.5 战中救场

玩家给 T-Dog 使用高能嘲讽电池。

金币变化：战斗中禁止临时购买。若玩家库存中有高能嘲讽电池，则库存 -1，并消耗本局 1 次道具使用次数。

战斗变化：

TDog.HP = min(TDog.maxHP, TDog.HP + 60)

TDog.statuses.add("SHIELD_ONCE")

TDog.statuses.add("TAUNT_1_ACTION")

下一次其他演员选目标时，代码优先将目标指向 T-Dog。

### 15.6 结算

节目结束，T-Dog 胜出。

玩家下注 300 G，T-Dog 当局赔率 x2.8。

payout = floor(300 * 2.8) = 840 G

profit = 540 G

玩家金币 +840 G。

T-Dog 片酬 +60 S。

如果 T-Dog 也是 MVP，再 +25 S。

---

## 16. 第一版不做内容

演员负债不做。

演员随身战斗道具不做。

演员升级加属性不做。

演员好感提高抽取概率不做。

战中救援增加演员好感不做。

聊天增加 Zog 好感不做。

聊天增加演员好感不做。

节目效果分不做。

造成伤害发片酬不做。

战地记者点名发奖励不做。

复杂动态赔率不做。

跨演员转移片酬不做。

复杂每日任务不做。

CRT 显示器升级不做。

电视天线升级不做。

收音机升级不做。

设备升级带来的战斗数值增强不做。

---

## 17. 第一版数值验收标准

玩家只需要理解三件事：

金币从挂机、乞讨、赌博来。

金币花在下注、道具、礼物、设备、重连、变异、上帝指令和演员永久 Prompt 注入上。

演员通过节目名次和 MVP 拿片酬，片酬只能花在自己身上。

战斗中玩家能明确看到：

谁掉血。

谁控制了更多渡渡鸟。

谁获得了更多鸟群信任和巢区影响力。

谁更可能获胜。

自己押的演员现在值不值得救。

结算时玩家能明确看到：

赌赢还是赌输。

赚了多少金币。

演员拿了多少片酬。

谁是 MVP。

自己的下注给演员涨了多少好感。

Zog 好感和演员好感不干扰战斗数值。它们只负责长期目标和情感沉淀。

**
