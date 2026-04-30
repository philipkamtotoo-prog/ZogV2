# 需求变更文档 (CRD) - ZogV1 Battle System v3

**版本**: v3.0
**日期**: 2026-03-06
**状态**: 已完成

---

## 1. 项目概述

Alien TV (Zog) 是一款基于 LLM 的 AI 角色战斗模拟游戏。玩家管理一个 TV 频道，喂养外星宠物 Zog，观看 AI 角色在竞技场中战斗。

### 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand + IndexedDB 持久化
- **AI 接入**: 硅基流动 API (OpenAI 兼容) + Gemini Flash

---

## 2. 功能模块

### 2.1 Zog 陪伴系统

| 功能 | 状态 | 说明 |
|------|------|------|
| Zog 客厅可视化 | ✅ 已完成 | ZogRoom 组件展示 Zog 活动状态 |
| 零食喂食系统 | ✅ 已完成 | 购买零食后消耗，增加经验值 |
| Zog 对话系统 | ✅ 已完成 | 独立聊天窗口，支持 LLM 对话 |
| 经验等级系统 | ✅ 已完成 | 10 级经验系统，5 阶段性格映射 |
| 剧本生成系统 | ✅ 已完成 | LLM 生成日常剧本台词 |
| 捡垃圾系统 | ✅ 已完成 | Zog 外出捡垃圾，带回金币和物品 |

### 2.2 战斗系统

| 功能 | 状态 | 说明 |
|------|------|------|
| 场景选择 | ✅ 已完成 | TikTok/荒岛/赌场三种场景 |
| 角色抽取 | ✅ 已完成 | 随机抽取 5 个角色 |
| 指令注入 | ✅ 已完成 | 每个角色可注入自定义指令 |
| 变异系统 | ✅ 已完成 | 三选一变异效果 |
| 回合制战斗 | ✅ 已完成 | 最多 20 回合 |
| 上帝指令干预 | ✅ 已完成 | 预审法官 + 意图澄清 |
| 阶段简报 | ✅ 已完成 | 每 5 回合 Zog 简报 |
| 战后结算 | ✅ 已完成 | 战报 + 金币结算 |

### 2.3 经济系统

| 功能 | 状态 | 说明 |
|------|------|------|
| 金币产出 | ✅ 已完成 | 挂机 + 战斗结算 + 捡垃圾 |
| 商店系统 | ✅ 已完成 | 零食/战斗道具/潮牌 |
| 键盘升级 | ✅ 已完成 | 9 级，输入字数上限提升 |
| 押注系统 | ✅ 已完成 | 1:3 赔率 |

---

## 3. 核心实现

### 3.1 状态管理

#### useZogStore (独立 Zustand Store)

```typescript
// 位置: src/features/zog/zogSlice.ts
// 持久化 key: 'zog-storage'

interface ZogStore {
  // 状态
  currentState: ZogState;           // IDLE_SOFA | BUSY_FRIDGE | BUSY_RADIO | AWAY_SCAVENGING | INTERACTING_CHAT
  currentScript: ZogSessionScript;   // LLM 生成的日常剧本
  isAway: boolean;                  // 是否外出捡垃圾
  chatHistory: ChatMessage[];       // 对话历史
  exp: number;                     // 经验值 (0-16369)
  level: number;                   // 等级 (1-10)

  // 方法
  addExp(amount: number, source: 'GIFT' | 'CHAT'): void;
  addChatMessage(message): void;
  generateDailyScript(): Promise<void>;
  startScavenge(): boolean;
  completeScavenge(): { gold: number; item?: string; text: string } | null;
}
```

#### useGameStore (主 Store)

```typescript
// 位置: src/stores/index.ts
// 持久化 key: 'game-storage'

interface GameStore {
  // Player Slice
  gold: number;
  keyboardLevel: number;
  inventory: Record<string, number>;

  // Zog Slice (旧版，仅保留兼容)
  affection: number;

  // Combat Slice
  combatStatus: CombatStatus;
  battleLogs: BattleLog[];
}
```

### 3.2 路由结构

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | SplashScreen | 启动页，2秒后自动跳转 |
| `/hub` | HubView | 客厅主场景 |
| `/shop` | ShopView | 商店页面 |
| `/inventory` | InventoryView | 背包页面 |
| `/arena` | ArenaView | 战斗竞技场 |
| `/agent` | AgentDashboard | 演员管理面板 |

### 3.3 关键组件

| 组件 | 路径 | 说明 |
|------|------|------|
| ZogRoom | `src/features/zog/components/ZogRoom.tsx` | 客厅可视化 |
| ZogChatWindow | `src/features/zog/components/ZogChatWindow.tsx` | 聊天窗口 |
| BattleScreen | `src/features/battle/components/BattleScreen.tsx` | 战斗主界面 |
| ShopView | `src/pages/ShopView.tsx` | 商店页面 |
| InventoryView | `src/pages/InventoryView.tsx` | 背包页面 |

---

## 4. 经验系统详情

### 4.1 经验阈值 (10 级)

| 等级 | 经验门槛 | 段位名称 |
|------|----------|----------|
| Lv 1 | 0 | 陌生人 |
| Lv 2 | 20 | 点头之交 |
| Lv 3 | 70 | 熟人 |
| Lv 4 | 170 | 死党 |
| Lv 5 | 370 | 挚友 |
| Lv 6 | 770 | 灵魂伴侣 |
| Lv 7 | 1570 | 共生体 |
| Lv 8 | 3170 | 至爱 |
| Lv 9 | 6370 | 神选 |
| Lv 10 | 16369 | 永恒 |

### 4.2 5 阶段性格映射

- Lv 1-2 → 阶段一：警惕的流浪者
- Lv 3-4 → 阶段二：勉强的室友
- Lv 5-6 → 阶段三：傲娇的损友
- Lv 7-8 → 阶段四：护短的监护人
- Lv 9-10 → 阶段五：灵魂绑定伴侣

### 4.3 经验来源

| 来源 | 数值 | 说明 |
|------|------|------|
| 喂食二手干电池 | +5 EXP | 消耗品 |
| 喂食润滑口服液 | +20 EXP | 消耗品 |
| 喂食硅基软糖 | +50 EXP | 消耗品 |
| 喂食 RTX 蛋糕 | +100 EXP | 消耗品 |
| 对话聊天 | -2 ~ +5 EXP | LLM 判断 |

---

## 5. 已解决问题

| 问题 | 解决方案 |
|------|----------|
| LLM JSON 解析错误 | 使用 safeParseJSON + 正则 fallback |
| Buff 状态幻觉 | TypeScript 硬编码，LLM 只输出情绪标签 |
| 伤害计算幻觉 | LLM 输出 multiplier，前端硬编码公式 |
| 预审法官复杂度 | 前端动态生成选择题选项 |
| Zog 记忆丢失 | 剧本系统 + 上下文注入 |

---

## 6. 涉及文件

| 文件 | 变更类型 |
|------|---------|
| src/features/zog/zogSlice.ts | 新增 |
| src/features/zog/components/ZogChatWindow.tsx | 新增 |
| src/pages/ShopView.tsx | 新增 |
| src/pages/InventoryView.tsx | 新增 |
| src/core/llm/zogPrompt.ts | 新增 |
| src/core/storage/GameStorageAdapter.ts | 新增 |
| src/hooks/useIdleIncome.ts | 新增 |

---

## 7. 评审记录

| 日期 | 评审人 | 意见 |
|------|--------|------|
| 2026-02-19 | Claude | v2.0 初始版本 |
| 2026-03-06 | Claude | v3.0 更新至当前代码状态 |

## 8. 实现记录

| 功能 | 状态 | 文件 |
|------|------|------|
| Judge Agent 独立化 | ✅ 已完成 | src/core/llm/client.ts, prompts.ts, battleEngine.ts |
| 选择题增强 (4道+所有人) | ✅ 已完成 | src/core/llm/prompts.ts |
| 环境惩罚机制 | ✅ 已完成 | src/features/battle/battleSlice.ts |
| 无伤害判决显示 | ✅ 已完成 | src/features/battle/components/BattleScreen.tsx |
| 四种战斗状态 | ✅ 已完成 | src/features/battle/battleSlice.ts, BattleScreen.tsx |
| 全局环境数据 | ✅ 已完成 | src/core/llm/types.ts, prompts.ts |
| JSON 解析增强 | ✅ 已完成 | src/core/llm/jsonParser.ts |
| Zog 经验系统 | ✅ 已完成 | src/features/zog/zogSlice.ts |
| Zog 聊天窗口 | ✅ 已完成 | src/features/zog/components/ZogChatWindow.tsx |
| 商店页面 | ✅ 已完成 | src/pages/ShopView.tsx |
| 背包页面 | ✅ 已完成 | src/pages/InventoryView.tsx |
