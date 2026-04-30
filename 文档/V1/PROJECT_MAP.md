# 项目结构映射 (PROJECT_MAP)

## 项目概述

Alien TV (Zog) - 基于 LLM 的 AI 角色战斗模拟游戏。玩家管理一个 TV 频道，喂养外星宠物 Zog，观看 AI 角色在竞技场中战斗。

---

## 目录结构

```
ZogV1/
├── src/                      # 源代码根目录
│   ├── App.tsx              # 应用入口，路由配置
│   ├── main.tsx             # React 入口点
│   ├── vite-env.d.ts        # Vite 类型定义
│   ├── pages/               # 页面组件
│   ├── features/            # 功能模块
│   ├── core/                # 核心工具
│   ├── stores/              # 状态管理
│   ├── hooks/               # 自定义 Hooks
│   ├── components/          # 公共组件
│   └── styles/              # 全局样式
│
├── doc/                     # 项目文档
├── public/                  # 静态资源
├── index.html               # HTML 入口
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 配置
└── tailwind.config.js       # Tailwind 配置
```

---

## 页面组件 (src/pages/)

| 文件 | 路由 | 描述 |
|------|------|------|
| [SplashScreen.tsx](src/pages/SplashScreen.tsx) | `/` | 启动页，2秒后自动跳转 |
| [HubView.tsx](src/pages/HubView.tsx) | `/hub` | 客厅主场景 |
| [ArenaView.tsx](src/pages/ArenaView.tsx) | `/arena` | 战斗竞技场 |
| [ShopView.tsx](src/pages/ShopView.tsx) | `/shop` | 商店页面 |
| [InventoryView.tsx](src/pages/InventoryView.tsx) | `/inventory` | 背包页面 |
| [AgentDashboard.tsx](src/pages/AgentDashboard.tsx) | `/agent` | 演员管理面板 |

---

## 功能模块 (src/features/)

### Zog 模块 (src/features/zog/)

| 文件 | 描述 |
|------|------|
| [zogSlice.ts](src/features/zog/zogSlice.ts) | Zog 状态管理 (独立 Zustand Store) |
| [types.ts](src/features/zog/types.ts) | Zog 类型定义 |

#### Zog 组件 (src/features/zog/components/)

| 文件 | 描述 |
|------|------|
| [ZogRoom.tsx](src/features/zog/components/ZogRoom.tsx) | 客厅可视化组件 |
| [ZogChatWindow.tsx](src/features/zog/components/ZogChatWindow.tsx) | 聊天窗口组件 |

### 战斗模块 (src/features/battle/)

| 文件 | 描述 |
|------|------|
| [battleSlice.ts](src/features/battle/battleSlice.ts) | 战斗状态管理 (Zustand) |
| [preparationSlice.ts](src/features/battle/preparationSlice.ts) | 备战状态管理 |
| [types.ts](src/features/battle/types.ts) | 战斗类型定义 |
| [mockData.ts](src/features/battle/mockData.ts) | 模拟数据 |

#### 战斗组件 (src/features/battle/components/)

| 文件 | 描述 |
|------|------|
| [BattleScreen.tsx](src/features/battle/components/BattleScreen.tsx) | 战斗主界面 |
| [PreparationWizard.tsx](src/features/battle/components/PreparationWizard.tsx) | 备战向导 |
| [EntityCard.tsx](src/features/battle/components/EntityCard.tsx) | 角色卡片 |
| [LogEntry.tsx](src/features/battle/components/LogEntry.tsx) | 战斗日志条目 |
| [IntentClarification.tsx](src/features/battle/components/IntentClarification.tsx) | 意图clarification |
| [PeriodicBriefingCard.tsx](src/features/battle/components/PeriodicBriefingCard.tsx) | 周期性简报 |
| [FinalReportCard.tsx](src/features/battle/components/FinalReportCard.tsx) | 战后报告卡片 |
| [TacticalBar.tsx](src/features/battle/components/TacticalBar.tsx) | 战术操作栏 |

### 元数据模块 (src/features/meta/)

| 文件 | 描述 |
|------|------|
| [metaSlice.ts](src/features/meta/metaSlice.ts) | 演员持久化数据管理 |
| [types.ts](src/features/meta/types.ts) | 演员类型定义 |

#### 元数据组件 (src/features/meta/components/)

| 文件 | 描述 |
|------|------|
| [AgentDashboard.tsx](src/features/meta/components/AgentDashboard.tsx) | 演员仪表盘 |
| [ActorDetailModal.tsx](src/features/meta/components/ActorDetailModal.tsx) | 演员详情弹窗 |

### 商店模块 (src/features/shop/)

| 文件 | 描述 |
|------|------|
| [components/ActorPayModal.tsx](src/features/shop/components/ActorPayModal.tsx) | 演员薪资弹窗 |

### 设置模块 (src/features/settings/)

| 文件 | 描述 |
|------|------|
| [modelConfigSlice.ts](src/features/settings/modelConfigSlice.ts) | LLM 模型配置 |
| [components/ModelConfigModal.tsx](src/features/settings/components/ModelConfigModal.tsx) | 配置弹窗 |

---

## 核心工具 (src/core/)

### 常量 (src/core/constants/)

| 文件 | 描述 |
|------|------|
| [index.ts](src/core/constants/index.ts) | 游戏配置常量 |

#### 常量内容

- **COLORS**: 颜色系统 (void, card, CRT, text, accents)
- **ROUTES**: 路由映射
- **KEYBOARD_LEVEL_CONFIG**: 键盘等级配置
- **GAME_CONFIG**: 游戏数值配置
- **SHOP_ITEMS**: 商店物品配置
- **SNACK_SHOP_ITEMS**: 零食物品配置
- **STATIC_ACTORS**: 演员静态数据

### 类型 (src/core/types/)

| 文件 | 描述 |
|------|------|
| [index.ts](src/core/types/index.ts) | 全局类型定义 |

#### 主要类型

- `Agent`: 演员类型
- `PlayerState`: 玩家状态
- `ZogState`: Zog 状态
- `CombatStatus`: 战斗状态
- `BattleLog`: 战斗日志
- `Scenario`: 战斗场景
- `Mutation`: 战斗变异
- `ModelConfig`: 模型配置

### LLM 集成 (src/core/llm/)

| 文件 | 描述 |
|------|------|
| [client.ts](src/core/llm/client.ts) | LLM 客户端单例 |
| [fetchCompletion.ts](src/core/llm/fetchCompletion.ts) | API 请求封装 |
| [types.ts](src/core/llm/types.ts) | LLM 类型定义 |
| [jsonParser.ts](src/core/llm/jsonParser.ts) | JSON 解析器 |
| [characterPrompt.ts](src/core/llm/characterPrompt.ts) | 角色提示词 |
| [judgePrompt.ts](src/core/llm/judgePrompt.ts) | 裁判提示词 |
| [preTrialJudgePrompt.ts](src/core/llm/preTrialJudgePrompt.ts) | 赛前裁判提示词 |
| [reporterPrompt.ts](src/core/llm/reporterPrompt.ts) | 战报提示词 |
| [zogPrompt.ts](src/core/llm/zogPrompt.ts) | Zog 提示词 |
| [test-client.ts](src/core/llm/test-client.ts) | 测试工具 |

### 游戏循环 (src/core/game-loop/)

| 文件 | 描述 |
|------|------|
| [battleEngine.ts](src/core/game-loop/battleEngine.ts) | 战斗引擎 |
| [reporter.ts](src/core/game-loop/reporter.ts) | 战报生成器 |

### 场景系统 (src/core/scenes/)

| 文件 | 描述 |
|------|------|
| [SceneManager.ts](src/core/scenes/SceneManager.ts) | 场景管理器 |
| [types.ts](src/core/scenes/types.ts) | 场景类型 |

#### 支持场景

- `tiktok_battle`: TikTok 流量战
- `island_survival`: 荒岛大逃杀
- `casino_night`: 星际赌场

### 存储系统 (src/core/storage/)

| 文件 | 描述 |
|------|------|
| [GameStorageAdapter.ts](src/core/storage/GameStorageAdapter.ts) | IndexedDB 存储适配器 |

---

## 状态管理 (src/stores/)

| 文件 | 描述 |
|------|------|
| [index.ts](src/stores/index.ts) | 主状态存储 (Zustand) |

#### Slice 类型

- **PlayerSlice**: 金币、库存、装备升级
- **ZogSlice**: 好感度、活动、聊天历史
- **ArenaDraftSlice**: 选秀模式、可用演员、场景
- **CombatSlice**: 战斗状态、回合、战斗日志
- **SettingsSlice**: 音量、语言、API 配置

#### 独立 Zog Store

- **useZogStore**: Zog 专属状态管理 (持久化 key: `zog-storage`)

---

## Hooks (src/hooks/)

| 文件 | 描述 |
|------|------|
| [useIdleIncome.ts](src/hooks/useIdleIncome.ts) | 挂机收益 Hook |

---

## 公共组件 (src/components/)

| 文件 | 描述 |
|------|------|
| [CRTOverlay.tsx](src/components/common/CRTOverlay.tsx) | CRT 电视效果覆盖层 |
| [StarRadio.tsx](src/components/ui/StarRadio.tsx) | 星球电台组件 |
| [Typewriter.tsx](src/components/ui/Typewriter.tsx) | 打字机效果组件 |

---

## 数据流

```
App.tsx (Router)
  │
  ├── SplashScreen → HubView
  │     │
  │     ├── ShopView (商店页面)
  │     ├── InventoryView (背包页面)
  │     ├── ZogRoom (Zog 可视化)
  │     │     ├── 剧本系统 (generateDailyScript)
  │     │     ├── 聊天窗口 (ZogChatWindow)
  │     │     └── 捡垃圾 (startScavenge)
  │     │
  │     ├── AgentDashboard (演员管理)
  │     └── Idle Income Hook (自动金币)
  │
  └── ArenaView
        │
        ├── PreparationWizard
        │     ├── SELECT_CHANNEL (选择场景)
        │     ├── DRAW_ACTORS (抽取演员)
        │     ├── PROGRAM_SETUP (注入指令)
        │     └── READY (准备开始)
        │
        └── BattleScreen (FIGHTING)
              │
              ├── battleEngine.ts → llmClient
              │
              ├── 场景特定规则
              │
              └── Settlement (战后结算)
```

---

## 路由配置

| 路径 | 组件 | 描述 |
|------|------|------|
| `/` | SplashScreen | 启动页 |
| `/hub` | HubView | 客厅 |
| `/shop` | ShopView | 商店 |
| `/inventory` | InventoryView | 背包 |
| `/arena` | ArenaView | 竞技场 |
| `/agent` | AgentDashboard | 演员面板 |
| `/settings` | ModelConfigModal | 设置 (弹窗) |

---

## 持久化存储

- **IndexedDB**: 通过 GameStorageAdapter 适配器
- **Zustand Persist Middleware**: 自动状态持久化

### 持久化数据

| Storage Key | 数据 |
|-------------|------|
| `game-storage` | 玩家金币、库存、键盘等级、好感度 |
| `zog-storage` | Zog 经验、等级、剧本、聊天历史 |
| `meta-storage` | 演员数据 |
| `settings-storage` | API 配置 |

---

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand
- 样式使用 Tailwind CSS
- AI 交互遵循"数值硬编码"原则

### 核心原则

1. **数值逻辑硬编码**: 所有游戏机制数值计算必须用 TypeScript，避免 LLM 幻觉
2. **LLM 只负责叙事**: LLM 输出自然语言，数值由前端/后端计算
3. **经济系统保护**: 任何绕过游戏机制的路径必须被拦截
4. **类型安全**: 使用 TypeScript 严格类型定义
