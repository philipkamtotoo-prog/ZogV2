# 技术栈文档 (TECH_STACK)

---

## 1. 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 6.x | 构建工具 |
| Tailwind CSS | 4.x | 样式方案 |
| Zustand | 5.x | 状态管理 |
| React Router | 6.x | 路由管理 |
| idb-keyval | - | IndexedDB 封装 |

> **注意**: 原计划中的 Framer Motion 未使用，改用纯 CSS 动画。

---

## 2. AI 服务

### 2.1 自定义 LLM 客户端

```typescript
// src/core/llm/client.ts

class LLMClient {
  private provider: 'siliconflow' | 'deepseek';
  private apiKey: string;
  private model: string;

  async generateBattleLog(context: BattleContext): Promise<BattleResponse>
  async generateJudgeVerdict(context: JudgeContext, action: any): Promise<JudgeVerdict>
  async generateClarification(context: ClarificationContext): Promise<ClarificationResult>
  async generatePeriodicBriefing(logs: BattleLog[]): Promise<PeriodicBriefing>
  async generateFinalReport(survivors: BattleEntity[]): Promise<FinalReport>
}
```

### 2.2 API 提供商配置

```typescript
// 支持的 AI 提供商
type AIProvider = 'siliconflow' | 'deepseek' | 'openai' | 'claude';

// 按角色区分模型配置
interface ModelConfig {
  provider: AIProvider;
  apiKey: string;
  characterModel: string;    // 角色对话模型
  judgeModel: string;        // 裁判模型
  reporterModel: string;      // 战报模型
  zogModel: string;          // Zog 对话模型
}

// 存储在 src/features/settings/modelConfigSlice.ts
```

---

## 3. 数据存储

### 3.1 存储层级

| 层级 | 技术 | 数据类型 |
|------|------|----------|
| 运行时状态 | Zustand Store | 游戏进行中的临时状态 |
| 持久数据 | Zustand Persist + IndexedDB | 金币、道具、解锁进度 |
| 静态配置 | TypeScript 常量 | 角色卡库、游戏配置 |

> **注意**: 使用 Zustand Persist 中间件将状态持久化到 IndexedDB（通过 GameStorageAdapter）。

### 3.2 持久化配置

```typescript
// src/stores/index.ts

persist(
  (set, get) => ({
    // ...slice implementations
  }),
  {
    name: 'game-storage',
    storage: createJSONStorage(() => GameStorageAdapter),
    partialize: (state) => ({
      gold: state.gold,
      inventory: state.inventory,
      keyboardLevel: state.keyboardLevel,
      crtLevel: state.crtLevel,
      affection: state.affection,
    }),
  }
)
```

### 3.3 多存储分离

| Storage Key | 数据 | 适配器 |
|-------------|------|--------|
| `game-storage` | 玩家金币、库存、键盘等级 | GameStorageAdapter |
| `zog-storage` | Zog 经验、等级、剧本、聊天 | GameStorageAdapter |
| `meta-storage` | 演员数据 | GameStorageAdapter |
| `settings-storage` | API 配置 | GameStorageAdapter |

---

## 4. 目录结构

```
src/
├── core/
│   ├── constants/
│   │   └── index.ts              # 游戏常量、颜色配置
│   │
│   ├── types/
│   │   └── index.ts              # 核心类型定义
│   │
│   ├── storage/
│   │   └── GameStorageAdapter.ts  # IndexedDB 适配器
│   │
│   ├── game-loop/
│   │   ├── battleEngine.ts       # 战斗引擎
│   │   └── reporter.ts           # 战报生成器
│   │
│   ├── llm/                      # LLM 客户端模块
│   │   ├── client.ts             # 主客户端
│   │   ├── fetchCompletion.ts    # API 请求封装
│   │   ├── jsonParser.ts         # JSON 解析
│   │   ├── characterPrompt.ts    # 角色 Prompt
│   │   ├── judgePrompt.ts        # 裁判 Prompt
│   │   ├── preTrialJudgePrompt.ts # 预审法官 Prompt
│   │   ├── reporterPrompt.ts     # 战报 Prompt
│   │   ├── zogPrompt.ts          # Zog Prompt
│   │   └── types.ts              # LLM 类型
│   │
│   └── scenes/
│       └── SceneManager.ts        # 场景管理器
│
├── features/
│   ├── zog/
│   │   ├── zogSlice.ts           # Zog 状态管理
│   │   ├── types.ts              # Zog 类型定义
│   │   └── components/
│   │       ├── ZogRoom.tsx       # 客厅可视化
│   │       └── ZogChatWindow.tsx # 聊天窗口
│   │
│   ├── battle/
│   │   ├── battleSlice.ts        # 战斗状态管理
│   │   ├── preparationSlice.ts   # 备战状态管理
│   │   ├── mockData.ts           # 模拟数据
│   │   ├── types.ts              # 战斗类型定义
│   │   └── components/
│   │       ├── BattleScreen.tsx
│   │       ├── PreparationWizard.tsx
│   │       ├── IntentClarification.tsx
│   │       ├── EntityCard.tsx
│   │       ├── LogEntry.tsx
│   │       ├── PeriodicBriefingCard.tsx
│   │       ├── FinalReportCard.tsx
│   │       └── TacticalBar.tsx
│   │
│   ├── meta/
│   │   ├── metaSlice.ts          # 演员持久化数据
│   │   ├── types.ts              # 演员类型
│   │   └── components/
│   │       ├── AgentDashboard.tsx
│   │       └── ActorDetailModal.tsx
│   │
│   ├── shop/
│   │   └── components/
│   │       └── ActorPayModal.tsx
│   │
│   └── settings/
│       ├── modelConfigSlice.ts   # 模型配置
│       └── components/
│           └── ModelConfigModal.tsx
│
├── stores/
│   └── index.ts                  # 主 Store (Zustand + Slices)
│
├── hooks/
│   └── useIdleIncome.ts          # 挂机收益 Hook
│
├── components/
│   ├── common/
│   │   └── CRTOverlay.tsx       # CRT 电视效果
│   └── ui/
│       ├── StarRadio.tsx         # 星际收音机
│       └── Typewriter.tsx        # 打字机效果
│
├── pages/
│   ├── SplashScreen.tsx
│   ├── HubView.tsx              # 客厅页面
│   ├── ShopView.tsx             # 商店页面
│   ├── InventoryView.tsx         # 背包页面
│   ├── ArenaView.tsx            # 战斗页面
│   └── AgentDashboard.tsx       # 演员管理页面
│
├── App.tsx
└── main.tsx
```

---

## 5. 状态管理 (Zustand)

### 5.1 独立 Zog Store

```typescript
// src/features/zog/zogSlice.ts

interface ZogStore {
  currentState: ZogState;
  currentScript: ZogSessionScript | null;
  isAway: boolean;
  chatHistory: ChatMessage[];
  exp: number;
  level: number;

  addExp(amount: number, source: 'GIFT' | 'CHAT'): void;
  addChatMessage(message): void;
  generateDailyScript(): Promise<void>;
  startScavenge(): boolean;
  completeScavenge(): { gold: number; item?: string; text: string } | null;
}
```

### 5.2 主 Store (src/stores/index.ts)

```typescript
type GameStore = PlayerSlice &
                 ZogSlice &
                 ArenaDraftSlice &
                 CombatSlice &
                 SettingsSlice;
```

---

## 6. 构建配置

### 6.1 Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

### 6.2 Tailwind CSS v4

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-void: #0b0e14;
  --color-card: #1a1f2e;
  --color-primary: #e2e8f0;
  --color-muted: #94a3b8;
  --color-terminal: #00ff41;
  --color-cyan: #4cc9f0;
  --color-pink: #f72585;
  --color-yellow: #ffee00;
  --color-zog: #a3e635;
}
```

---

## 7. 开发环境

| 工具 | 版本 |
|------|------|
| Node.js | v20+ |
| npm | 10.x |
| VS Code | 最新（推荐） |

---

## 8. 支持的场景

| 场景 ID | 名称 | 描述 |
|---------|------|------|
| `tiktok_battle` | TikTok 流量战 | 流量即生命值 |
| `island_survival` | 荒岛大逃杀 | 经典大逃杀规则 |
| `casino_night` | 星际赌场 | 运气与策略并重 |

---

## 9. 核心开发原则

### 9.1 数值硬编码

所有游戏机制数值计算必须用 TypeScript，避免 LLM 幻觉：

- 伤害公式：`baseAtk * multiplier * diceRoll(0.8-1.2)`
- Buff 效果：TypeScript 硬编码，LLM 只输出情绪标签
- 经济计算：前端校验，防止作弊

### 9.2 LLM 职责分离

- **LLM 只负责叙事**：输出自然语言文本
- **数值由前端计算**：所有游戏数值逻辑在 TypeScript 中处理

### 9.3 存储策略

- **高频数据**：Zustand 内存状态
- **低频数据**：IndexedDB 持久化
- **静态数据**：TypeScript 常量
