# 战斗系统架构文档 (BATTLE_ARCHITECTURE)

> 本文档记录 ZogV1 战斗系统的核心架构设计。
> 基于 ZogV1 项目实战经验，供下一个项目参考。

---

## 1. 核心架构：Producer-Consumer 模式

战斗循环采用**严格串行**的 Producer-Consumer 模式，避免竞态条件。

```
┌─────────────────────────────────────────────────────────────┐
│                        BattleScreen.tsx                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [PRODUCER] ──► [ACTION QUEUE] ──► [CONSUMER] ──► [UI]   │
│                                                             │
│   职责：调用 LLM      职责：缓冲       职责：消费动作    职责：渲染 │
│   位置：行 171-220   位置：battleSlice  位置：行 101-166   位置：JSX │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Producer（生产者）

**职责**：调用 LLM 获取战斗数据，产出 ActionItem 入队。

**触发条件**（全部满足才执行）：
- `phase === 'FIGHTING'`
- `battleStatus === 'COMBAT_RUNNING'`
- `actionQueue.length === 0`（队列空）
- `!isFetchingLLM`（没有其他请求在进行）
- `!isWaitingForClick`（不在等待玩家点击）

**关键代码位置**：`BattleScreen.tsx` 行 171-220

**状态保护**：
- 发出请求前检查 `battleStatus`，请求回来后再检查
- 如果中途状态变为 `PAUSED` 或 `GOD_INTERVENTION_PENDING`，丢弃结果

### 1.2 Action Queue（队列）

**职责**：解耦 LLM 生产速度和 UI 消费速度。

**类型定义** (`battle/types.ts`)：
```typescript
interface ActionItem {
  id: string;
  type: 'CHAR_SPEECH' | 'GOD_COMMAND' | 'ENVIRONMENTAL_EVENT';
  data: BattleResponse | GodCommand | EnvironmentalCrisis;
}
```

**在 battleSlice.ts 中管理**：
```typescript
actionQueue: ActionItem[];

// 入队
enqueueActions: (actions: ActionItem[]) => void;

// 出队
dequeueAction: () => void;

// 清空（预审法官介入时强制清空）
clearQueue: () => void;
```

### 1.3 Consumer（消费者）

**职责**：消费队列中的 ActionItem，触发 UI 更新。

**消费流程**：
1. 读取 `actionQueue[0]`
2. 调用 `applyTurnResult()` 更新状态
3. 根据 `playMode` 分支：
   - `AUTO`：等待阅读时间（`totalTextLength × 60ms`，上限 8 秒）
   - `MANUAL`：锁屏等待玩家点击
4. `dequeueAction()` 出队
5. 重复

**关键代码位置**：`BattleScreen.tsx` 行 101-166

### 1.4 UI（渲染）

**职责**：只负责渲染，根据 store 状态变化自动更新。

**重要规则**：UI 组件里不写业务逻辑！所有判断逻辑在 battleSlice 或 battleEngine。

---

## 2. 战斗状态机

### 2.1 Phase（阶段）

```typescript
type BattlePhase =
  | 'IDLE'           // 初始状态
  | 'PREPARATION'   // 备战阶段（抽卡、注入、选场景）
  | 'FIGHTING'      // 战斗中
  | 'SETTLEMENT';   // 结算阶段
```

### 2.2 BattleStatus（战斗中状态）

```typescript
type BattleStatus =
  | 'COMBAT_RUNNING'              // 正常运行
  | 'AWAITING_LLM'               // 等待 LLM 响应
  | 'PAUSED'                      // 玩家手动暂停
  | 'GOD_INTERVENTION_PENDING';    // 上帝指令干预中（预审/追问）
```

### 2.3 状态流转图

```
                                    ┌────────────────────┐
                                    │   GOD_INTERVENTION │
                                    │      _PENDING      │
                                    └────────┬───────────┘
                                             │
                                    预审结束/追问结束
                                             │
                                             ▼
┌──────┐   开始战斗   ┌────────────────────┐    暂停    ┌────────┐
│ IDLE │ ─────────► │  COMBAT_RUNNING ◄──┼───────────┤ PAUSED │
└──────┘             └─────────┬──────────┘           └────────┘
                               │
                               │ 队列空 + 未请求中
                               ▼
                        ┌─────────────┐
                        │ AWAITING_LLM │
                        └──────┬──────┘
                               │ LLM 返回
                               ▼
                        COMBAT_RUNNING (循环)
```

---

## 3. 上帝指令干预系统

### 3.1 流程总览

```
玩家输入指令
     │
     ▼
[预审法官审查] ─── REJECT ───► 扣 10G 手续费，返还剩余金币
     │
     │ PASS
     ▼
[入队] ──► 下一轮插入 [系统事件]
     │
     │ CLARIFY
     ▼
[追问 UI] ──► TARGET（选择目标）──► 重新入队
     │        ──► DURATION（选择回合）──► 重新入队
     │        ──► INTENSITY（选择强度）──► 重新入队
```

### 3.2 预审法官 Prompt 设计

**核心原则**：LLM 只输出信号，前端硬编码 UI。

**Prompt 输出格式**（`preTrialJudgePrompt.ts`）：
```json
{
  "status": "PASS" | "REJECT" | "CLARIFY",
  "clarify_type": "TARGET" | "DURATION" | "INTENSITY" | null,
  "reason": "简短理由（可选）"
}
```

**拦截规则**：
- 禁止直接修改数值（"扣 50 血"、"满血"）
- 禁止强制结束（"1号赢了"）
- 拒绝打破第四面墙

### 3.3 追问 UI（IntentClarification.tsx）

**TARGET 模式**：从 store 读取存活实体列表，生成大头贴按钮。

**DURATION 模式**：硬编码选项 `[1回合, 2回合, 3回合, 永久]`。

**INTENSITY 模式**：硬编码选项 `[🌱 轻微, 🔥 中等, 💥 强烈]`。

**超时机制**：倒计时结束后默认跳过，指令以混沌状态注入。

### 3.4 竞态条件防护

**问题**：预审法官返回 REJECT 后，队列可能已经被消费了。

**解决方案**：
1. 预审开始时立即清空队列 `clearQueue()`
2. 预审开始时立即释放 LLM 锁 `setIsFetchingLLM(false)`
3. REJECT/PASS 后**立刻 return**，不信任后续流程

```typescript
// 错误 ❌：return 放在后面，容易穿透
handleSubmit() {
  const result = await llmClient.clarifyIntent(...);
  if (result.status === 'REJECT') return; // 太晚了
  // 中间的代码可能被穿透执行
}

// 正确 ✅：REJECT 时立刻 return
handleSubmit() async {
  const result = await llmClient.clarifyIntent(...);
  if (result.status === 'REJECT') {
    addGold(refundAmount);
    addLog({ content: `指令被拦截...` });
    return; // 立刻中断，不往下执行任何逻辑
  }
  // 只有 PASS 或 CLARIFY 才继续
}
```

---

## 4. Buff 系统（硬编码）

### 4.1 Buff 类型

```typescript
type BuffType =
  | 'TAUNT'           // 嘲讽：强制攻击嘲讽者
  | 'ATK_UP'          // 攻击增益：伤害 ×1.5
  | 'DEF_UP'          // 防御增益：伤害 ×0.5
  | 'ATK_DOWN'        // 攻击减益：伤害 ×0.7
  | 'DEF_DOWN'        // 防御减益：伤害 ×1.3
  | 'HEAL_OVER_TIME'; // 持续回血：每回合 +10% HP
```

### 4.2 Buff 生命周期

| 方法 | 位置 | 职责 |
|------|------|------|
| `applyBuff()` | battleSlice.ts | 挂载/刷新 Buff |
| `tickBuffs()` | battleSlice.ts | 每回合倒计时，过期删除 |
| `removeExpiredBuffs()` | battleSlice.ts | 清理过期 Buff |

### 4.3 Buff 在 AI Prompt 中的表示

**规则**：不告诉 AI Buff 机制，只翻译成情绪标签。

| Buff | 情绪标签 |
|------|---------|
| TAUNT | "你现在是全场公敌，请在发言中疯狂嘲讽所有人！" |
| ATK_UP | "系统提示：你现在感觉力量爆棚，请在发言中表现出极度的狂妄！" |
| DEF_UP | "系统提示：你正在严阵以待防守，请在发言中表现出冷静和谨慎。" |
| HEAL_OVER_TIME | 无需告知 AI，自动生效 |

---

## 5. 伤害计算（硬编码）

### 5.1 公式

```
最终伤害 = 基础攻击力 × 裁判表现分(0.0-2.0) × 骰子(0.8-1.2)
```

### 5.2 姿态判定

| 姿态 | 规则 |
|------|------|
| `attack` | 正常造成伤害 |
| `defend` | 伤害减半，嘲讽时无法防守 |
| `hide` | 伤害归零（除非有穿甲 Buff） |

### 5.3 LLM 输出 vs 前端计算

| LLM 输出 | 前端处理 |
|---------|---------|
| `action`（动作描述） | 直接渲染到日志 |
| `dialogue`（对话） | 直接渲染到日志 |
| `action_multiplier`（0.0-2.0） | 前端计算最终伤害 |
| `stance`（attack/defend/hide） | 前端应用姿态判定 |
| `targetId`（攻击目标） | 前端校验合法性 |

---

## 6. 阶段简报系统（Periodic Briefing）

### 6.1 触发机制

- **频率**：每 5 回合触发一次
- **方式**：`fireAndForgetReporter('PERIODIC')` — 异步，不阻塞主循环

### 6.2 fireAndForget 模式

```typescript
// 正确 ✅：异步，不阻塞主循环
const fireAndForgetReporter = async (type: 'PERIODIC' | 'FINAL') => {
  // 生成报告的异步逻辑...
};

// 在主循环中调用
fireAndForgetReporter('PERIODIC'); // 不 await

// 错误 ❌：await 会阻塞主循环
const report = await generateReport(); // 不要这样做
```

### 6.3 战报内容

| 类型 | 频率 | 内容 |
|------|------|------|
| PERIODIC | 每 5 回合 | 毒舌吐槽前 5 回合谁最惨、谁在摸鱼 |
| FINAL | 结算时 | 战报标题 + 正文 + MVP + 嘲讽文案 |

---

## 7. resetBattle 彻底清空清单

切换对局时必须清空的所有字段：

```typescript
resetBattle: () => {
  set({
    // 战斗状态
    phase: 'IDLE',
    battleStatus: 'COMBAT_RUNNING',
    previousBattleStatus: null,

    // 回合
    roundCount: 0,
    peaceRoundCount: 0,

    // 实体
    entities: [],

    // 队列
    actionQueue: [],
    isFetchingLLM: false,
    isWaitingForClick: false,

    // 日志
    logs: [],

    // Buff
    buffs: [],

    // 上帝指令
    godCommandQueue: [],
    isClarifying: false,

    // 预审
    isAnalyzingGodCommand: false,
    tempAnalysisLogId: null,

    // 战报
    periodicBriefings: [],
    isGeneratingBriefing: false,

    // 世界观
    worldContext: null,
  });
},
```

---

## 8. 涉及文件索引

| 文件 | 职责 |
|------|------|
| `features/battle/battleSlice.ts` | 状态管理、Buff、伤害计算、resetBattle |
| `features/battle/battleEngine.ts` | LLM 调用上下文构建 |
| `features/battle/components/BattleScreen.tsx` | Producer/Consumer 循环、UI 渲染入口 |
| `features/battle/components/IntentClarification.tsx` | 追问 UI |
| `core/llm/preTrialJudgePrompt.ts` | 预审法官 Prompt |
| `core/llm/client.ts` | LLM 客户端、clarifyIntent |
| `core/game-loop/reporter.ts` | 战报生成器 |

---

## 9. 经验教训

### 9.1 踩过的坑

| 坑 | 解决方案 |
|----|---------|
| 预审法官生成选项导致前端崩溃 | LLM 只输出信号，UI 硬编码 |
| REJECT 后指令仍然入队 | 立刻 return，不信任后续流程 |
| 切换对局后 Buff 记忆残留 | resetBattle 必须清空所有相关字段 |
| AUTO 模式发呆卡死 | 强制封顶阅读时间为 8 秒 |
| 伤害数值 LLM 输出不可控 | 硬编码公式，LLM 只输出 multiplier |
