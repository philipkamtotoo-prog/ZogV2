# 后端与数据结构 (BACKEND_STRUCTURE)

---

## 1. 存储架构概览

| 数据类型 | 存储方式 | 文件路径 |
|----------|----------|----------|
| 玩家存档 | Zustand Persist (IndexedDB) | `src/stores/index.ts` |
| Zog 数据 | Zustand Persist (独立 Store) | `src/features/zog/zogSlice.ts` |
| 演员数据 | Zustand Persist (独立 Store) | `src/features/meta/metaSlice.ts` |
| 静态配置 | TypeScript 常量 | `src/core/constants/index.ts` |
| API Key | LocalStorage | 浏览器存储 |
| 运行时状态 | Zustand | 内存 |

> **注意**: 本项目使用 Zustand Persist 中间件将状态持久化到 IndexedDB（通过 GameStorageAdapter），而非 localStorage。

---

## 2. 静态数据结构

### 2.1 角色卡库 (Agent Cards)

```typescript
// src/core/constants/index.ts
interface StaticActorData {
  id: string;
  name: string;
  avatar: string;
  desc: string;
  systemPrompt: string;
  battleStyle: string;
  baseHp: number;
  baseAtk: number;
}

const STATIC_ACTORS: Record<string, StaticActorData> = {
  'entity_1': {
    name: 'T-Dog',
    avatar: '🐶',
    desc: '忠诚、勇敢、重情重义的战士AI',
    systemPrompt: '你是一只重装机械犬...',
    battleStyle: '防御型坦克...',
    baseHp: 100,
    baseAtk: 85,
  },
  // ... 更多预设角色
};
```

### 2.2 场景配置 (Scenarios)

```typescript
// src/features/battle/mockData.ts
interface BattleScenario {
  id: string;
  name: string;
  description: string;
  requiredActors: number;
  rulesPrompt?: string;
}

const MOCK_SCENARIOS: BattleScenario[] = [
  {
    id: 'tiktok_battle',
    name: 'TikTok 流量战',
    description: '5 AI 抢占流量',
    requiredActors: 5,
  },
  {
    id: 'island_survival',
    name: '荒岛大逃杀',
    description: '生存竞赛模式',
    requiredActors: 5,
  },
  {
    id: 'casino_night',
    name: '星际赌场',
    description: '运气与心机',
    requiredActors: 3,
  },
];
```

### 2.3 变异池 (Mutations)

```typescript
// src/features/battle/mockData.ts
interface BattleMutation {
  id: string;
  name: string;
  description: string;
  effect: string;
}

const MOCK_MUTATIONS: BattleMutation[] = [
  {
    id: 'stutter',
    name: '全员结巴',
    description: '所有 AI 说话必须带"阿巴阿巴"',
    effect: 'ATK * 0.7',
  },
  {
    id: 'truth_mode',
    name: '真心话模式',
    description: '无法撒谎，攻击力翻倍',
    effect: 'ATK * 2.0',
  },
  {
    id: 'cyber_psychosis',
    name: '赛博精神病',
    description: '每隔一轮发疯大笑',
    effect: 'UNSTABLE',
  },
];
```

### 2.4 零食配置

```typescript
// src/core/constants/index.ts
interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  expBonus?: number;
  affectionBonus?: number;
  description?: string;
  category?: 'snack' | 'combat' | 'cosmetic';
}

const SNACK_SHOP_ITEMS: Record<string, ShopItem> = {
  used_battery: {
    id: 'used_battery',
    name: '二手干电池',
    icon: '🔋',
    price: 50,
    expBonus: 5,
  },
  // ... 更多零食
};
```

---

## 3. Zustand Store 数据结构

### 3.1 主 Store 架构

```typescript
// src/stores/index.ts
interface PlayerSlice {
  gold: number;
  keyboardLevel: number;
  crtLevel: number;
  inventory: Record<string, number>;
  statistics: { watchTime: number; interventions: number };
  addGold: (amount: number, source?: string) => void;
  spendGold: (amount: number) => boolean;
  buyItem: (itemId: string) => boolean;
}

interface ZogSlice {
  affection: number;
  currentActivity: ZogActivity;
  focusMode: boolean;
  chatHistory: ChatMessage[];
}

interface ArenaDraftSlice {
  draftMode: 'DIRECTOR' | 'REALTIME';
  selectedScenario: string | null;
  activeMutations: string[];
  betTargetId: string | null;
  betAmount: number;
}

interface CombatSlice {
  combatStatus: CombatStatus;
  roundCount: number;
  agentsRuntime: AgentRuntime[];
  battleLogs: BattleLog[];
}

interface SettingsSlice {
  volume: number;
  language: string;
  apiConfig: ModelConfig;
}
```

### 3.2 独立 Zog Store

```typescript
// src/features/zog/zogSlice.ts
interface ZogStore {
  // 状态
  currentState: ZogState;
  currentScript: ZogSessionScript | null;
  isAway: boolean;
  chatHistory: ChatMessage[];
  exp: number;
  level: number;

  // 方法
  addExp(amount: number, source: 'GIFT' | 'CHAT'): void;
  addChatMessage(message): void;
  generateDailyScript(): Promise<void>;
  startScavenge(): boolean;
  completeScavenge(): { gold: number; item?: string; text: string } | null;
}

// 持久化配置
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'zog-storage',
    storage: createJSONStorage(() => GameStorageAdapter),
    partialize: (state) => ({
      currentScript: state.currentScript,
      chatHistory: state.chatHistory,
      exp: state.exp,
      level: state.level,
    }),
  }
)
```

### 3.3 持久化配置

```typescript
// src/stores/index.ts
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'game-storage',
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

---

## 4. AI API 接口定义

### 4.1 统一 LLM 客户端

```typescript
// src/core/llm/client.ts

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BattleResponse {
  dialogue: string;
  action?: string;
  targetId?: string;
}

export interface JudgeVerdict {
  action_multiplier: number;
  damage?: number;
  targetId?: string;
  judge_comment?: string;
}

class LLMClient {
  async generateBattleLog(context: BattleContext): Promise<BattleResponse>
  async generateJudgeVerdict(context: JudgeContext, action: any): Promise<JudgeVerdict>
  async generateClarification(context: ClarificationContext): Promise<ClarificationResult>
}
```

### 4.2 Prompt 构建器

```typescript
// 角色对话 Prompt
export function buildCharacterPrompt(context: BattleContext): string

// 裁判 Prompt
export function buildJudgePrompt(context: JudgeContext, characterAction: any): string

// 预审法官 Prompt
export function buildPreTrialJudgePrompt(userInput: string, context: PreTrialJudgeContext): string

// 战报 Prompt
export function buildReporterPrompt(recentLogs: BattleLog[], type: 'PERIODIC' | 'FINAL'): string

// Zog 对话 Prompt
export function buildZogChatPrompt(level: number): string
```

### 4.3 JSON 解析器

```typescript
// src/core/llm/jsonParser.ts
export function safeParseJSON<T>(content: string): ParseResult<T>
export function parseBattleLogResponse(content: string): BattleResponse
export function parseJudgeVerdict(content: string): JudgeVerdict
```

---

## 5. 战斗系统核心模块

### 5.1 战斗引擎

```typescript
// src/core/game-loop/battleEngine.ts

// 主函数
export async function fetchTurnData(): Promise<BattleResponse>

// 辅助函数
export function findAliveTargets(entities: BattleEntity[], excludeId: string): BattleEntity[]
export function toLLMSpeaker(entity: BattleEntity): any
export function toLLMTargets(entities: BattleEntity[]): any
export function buildBattleContextWithoutJudge(): BattleContext
export function buildJudgeContext(): JudgeContext
```

### 5.2 战斗状态管理

```typescript
// src/features/battle/battleSlice.ts

interface BattleSlice {
  entities: BattleEntity[];
  currentSpeakerId: string | null;
  currentSpeakerIndex: number;
  turnOrder: string[];
  roundCount: number;
  battleStatus: BattleStatus;
  godCommandQueue: GodCommand[];

  applyTurnResult: (response: BattleResponse) => void;
  nextTurn: () => void;
  addGodCommand: (content: string) => void;
  applyBuff: (entityId: string, buff: Buff) => void;
  tickBuffs: () => void;
}
```

### 5.3 备战状态管理

```typescript
// src/features/battle/preparationSlice.ts

interface PreparationState {
  currentPhase: PreparationPhase;
  selectedScenario: BattleScenario | null;
  selectedActors: BattleEntity[];
  actorInjections: Record<string, string>;
  paidInjections: Record<string, boolean>;
  selectedMutation: BattleMutation | null;
  isMutationPaid: boolean;
}
```

---

## 6. Zog 系统核心模块

### 6.1 Zog 剧本生成

```typescript
// src/features/zog/zogSlice.ts

interface ZogSessionScript {
  offlineSummary: string;
  scavengeLoot: {
    gold: number;
    item?: string;
    text: string;
  };
  fridgeLines: string[];
  radioLines: string[];
  sofaLines: string[];
}

generateDailyScript: async () => {
  const level = get().level;
  const systemPrompt = buildZogScriptPrompt(level);
  const content = await fetchAICompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: '请生成今天的生活剧本。' },
  ], 'zog');

  const result = safeParseJSON<ZogScriptResponse>(content);
  // ...
}
```

### 6.2 经验系统

```typescript
// 10 级经验阈值
const EXP_THRESHOLDS = [0, 20, 70, 170, 370, 770, 1570, 3170, 6370, 16369];

// 等级计算
function getLevelFromExp(exp: number): number {
  return EXP_THRESHOLDS.reduce((lv, threshold, idx) =>
    exp >= threshold ? idx + 1 : lv, 1
  );
}

// 5 阶段性格映射
function getStageFromLevel(level: number): number {
  return Math.ceil(level / 2); // 1-2→1, 3-4→2, ..., 9-10→5
}
```

---

## 7. API Key 管理

### 7.1 存储方式

```typescript
// 使用 Zustand 存储，持久化到 localStorage
apiConfig: {
  provider: 'siliconflow' | 'deepseek' | 'openai' | 'claude';
  apiKey: string;
  model: string;
}
```

### 7.2 安全建议

| 措施 | 说明 |
|------|------|
| CSP | Content Security Policy 限制脚本执行 |
| HTTPS | 强制 HTTPS 传输 |
| 隐私声明 | UI 预留隐私声明位置 |

---

## 8. 目录结构

```
src/
├── core/
│   ├── constants/
│   │   └── index.ts          # 游戏常量配置
│   ├── storage/
│   │   └── GameStorageAdapter.ts # IndexedDB 适配器
│   ├── game-loop/
│   │   ├── battleEngine.ts   # 战斗引擎
│   │   └── reporter.ts       # 战报生成器
│   ├── llm/
│   │   ├── client.ts         # LLM 客户端
│   │   ├── fetchCompletion.ts
│   │   ├── jsonParser.ts
│   │   ├── characterPrompt.ts
│   │   ├── judgePrompt.ts
│   │   ├── preTrialJudgePrompt.ts
│   │   ├── reporterPrompt.ts
│   │   ├── zogPrompt.ts       # Zog Prompt
│   │   └── types.ts
│   └── types/
│       └── index.ts
├── features/
│   ├── zog/
│   │   ├── zogSlice.ts       # Zog 状态管理
│   │   ├── types.ts          # Zog 类型定义
│   │   └── components/       # Zog 组件
│   ├── battle/
│   │   ├── battleSlice.ts    # 战斗状态管理
│   │   ├── preparationSlice.ts
│   │   ├── mockData.ts
│   │   ├── types.ts
│   │   └── components/
│   ├── meta/
│   │   ├── metaSlice.ts      # 演员数据
│   │   └── components/
│   └── settings/
│       └── ...
├── stores/
│   └── index.ts              # 主 Store
├── hooks/
│   └── useIdleIncome.ts      # 挂机收益
├── components/
│   ├── common/
│   │   └── CRTOverlay.tsx
│   └── ui/
│       ├── StarRadio.tsx
│       └── Typewriter.tsx
└── pages/
    ├── HubView.tsx
    ├── ShopView.tsx
    ├── InventoryView.tsx
    ├── ArenaView.tsx
    └── AgentDashboard.tsx
```
