# 实现计划 (IMPLEMENTATION_PLAN)

---

## 1. 开发阶段概览

| 阶段 | 名称 | 优先级 | 预计工作量 | 状态 |
|------|------|--------|------------|------|
| Phase 1 | 基础设施搭建 | P0 | 1-2 天 | **[Completed]** |
| Phase 2 | 核心状态管理 | P0 | 1-2 天 | **[Completed]** |
| Phase 3 | 客厅模块 (Hub) | P0 | 2-3 天 | **[Completed]** |
| Phase 4 | 斗兽场 - 备战阶段 | P0 | 2-3 天 | **[Completed]** |
| Phase 5 | 斗兽场 - 战斗阶段 | P0 | 3-4 天 | **[Completed]** |
| Phase 6 | 斗兽场 - 结算阶段 | P1 | 1-2 天 | **[Completed]** |
| Phase 7 | AI 服务集成 | P0 | 2-3 天 | **[Completed]** |
| Phase 8 | 数据持久化 | P1 | 1-2 天 | **[Completed]** |
| Phase 9 | 经验与挂机系统 | P0 | 1-2 天 | **[Completed]** |
| Phase 10 | Zog 聊天系统 | P0 | 1-2 天 | **[Completed]** |
| Phase 11 | 商店与背包系统 | P0 | 1-2 天 | **[Completed]** |
| Phase 12 | 打磨与优化 | P2 | 持续 | Pending |

---

## 2. Phase 1: 基础设施搭建

### 任务清单

| 任务 | 描述 | 文件 |
|------|------|------|
| 项目初始化 | Vite + React + TS 项目 | `vite.config.ts`, `tsconfig.json` |
| Tailwind 配置 | 安装并配置 Tailwind CSS v4 | `vite.config.ts`, `globals.css` |
| 目录结构 | 创建完整目录结构 | - |
| 路由配置 | React Router 设置 | `App.tsx`, `main.tsx` |
| 常量定义 | 颜色、路由、游戏配置 | `core/constants/index.ts` |
| 类型定义 | 基础类型接口 | `core/types/index.ts` |

### 验收标准

- [x] `npm install` 成功
- [x] `npm run dev` 正常启动
- [x] 访问 `/` 显示 SplashScreen
- [x] 无 TypeScript 编译错误

---

## 3. Phase 2: 核心状态管理

### 任务清单

| 任务 | 描述 | 文件 |
|------|------|------|
| Zustand Store | 主 Store 和 Slices | `stores/index.ts` |
| Player Slice | 金币、等级、升级 | `stores/index.ts` |
| Zog Slice | 好感度、活动状态 | `stores/index.ts` |
| ArenaDraft Slice | 抽卡、场景、变异 | `stores/index.ts` |
| Combat Slice | 战斗状态、日志 | `features/battle/battleSlice.ts` |
| Preparation Slice | 备战状态 | `features/battle/preparationSlice.ts` |
| Settings Slice | 音量、API配置 | `stores/index.ts` |
| 独立 Zog Store | Zog 专属状态管理 | `features/zog/zogSlice.ts` |

### 验收标准

- [x] 所有 Slice 可独立工作
- [x] Store 组合无循环依赖
- [x] Zustand DevTools 可用

---

## 4. Phase 3: 客厅模块 (Hub)

### 任务清单

| 任务 | 描述 | 组件 |
|------|------|------|
| 页面框架 | HubView 基础布局 | `pages/HubView.tsx` |
| Zog 容器 | Zog 动画显示 | `features/zog/components/ZogRoom.tsx` |
| 电视组件 | 电视待机画面 | HubView 内置 |
| 底部导航 | 冰箱、收音机、门 | HubView 内置 |
| CRT 效果 | 仅电视区域生效 | `components/common/CRTOverlay.tsx` |
| 聊天窗口 | Zog 对话界面 | `features/zog/components/ZogChatWindow.tsx` |

### 验收标准

- [x] ZogRoom 正确显示
- [x] Zog 状态切换正常
- [x] CRT 效果仅电视内生效
- [x] 点击电视切换至 Arena

---

## 5. Phase 4: 斗兽场 - 备战阶段

### 任务清单

| 任务 | 描述 | 组件 |
|------|------|------|
| 抽卡界面 | 5 张角色卡展示 | `features/battle/components/PreparationWizard.tsx` |
| 角色卡组件 | EntityCard 卡片 | `features/battle/components/EntityCard.tsx` |
| 注入输入框 | Prompt 输入 | PreparationWizard 内置 |
| 变异选择 | 三选一弹窗 | PreparationWizard 内置 |
| 场景选择 | 场景列表 | PreparationWizard 内置 |
| 下注面板 | 押注 UI | ArenaView 内置 |

### 验收标准

- [x] 显示 5 张随机角色卡
- [x] 可输入 Prompt（限制 5-21 字，键盘等级决定）
- [x] 可选择 3 个变异中的 1 个
- [x] 可选择场景并下注
- [x] 点击"开始战斗"进入战斗阶段

---

## 6. Phase 5: 斗兽场 - 战斗阶段

### 任务清单

| 任务 | 描述 | 组件 |
|------|------|------|
| 战斗主界面 | BattleScreen | `features/battle/components/BattleScreen.tsx` |
| 战斗日志 | LogEntry | `features/battle/components/LogEntry.tsx` |
| 打字机效果 | Typewriter | `components/ui/Typewriter.tsx` |
| 实体卡片 | EntityCard | `features/battle/components/EntityCard.tsx` |
| 干预输入框 | God Command Input | BattleScreen 内置 |
| 意图澄清 | IntentClarification | `features/battle/components/IntentClarification.tsx` |
| 阶段简报 | Periodic Briefing | `features/battle/components/PeriodicBriefingCard.tsx` |
| 战术操作栏 | TacticalBar | `features/battle/components/TacticalBar.tsx` |

### 验收标准

- [x] 战斗循环正常工作
- [x] 对话以打字机效果显示
- [x] 底部常驻干预输入框
- [x] Pre-Trial Judge 正常工作
- [x] 每 5 轮显示阶段简报
- [x] 达到 20 轮或只剩一人结束战斗

---

## 7. Phase 6: 斗兽场 - 结算阶段

### 任务清单

| 任务 | 描述 | 组件 |
|------|------|------|
| 战报卡片 | 获胜 Agent 展示 | `features/battle/components/FinalReportCard.tsx` |
| 金币动画 | 结算动画 | - |
| 返回按钮 | 返回客厅 | - |

### 验收标准

- [x] 显示获胜 Agent 立绘 + 文案
- [x] 显示伤害排名
- [x] 正确计算金币收益
- [x] MVP 奖励正确计算
- [x] 点击返回客厅

---

## 8. Phase 7: AI 服务集成

### 任务清单

| 任务 | 描述 | 文件 |
|------|------|------|
| LLM 客户端 | 统一调用接口 | `core/llm/client.ts`, `fetchCompletion.ts` |
| Prompt 构建器 | Character/Judge/Reporter | `core/llm/*.ts` |
| JSON 解析器 | 响应解析 | `core/llm/jsonParser.ts` |
| 预审法官 | 上帝指令审查 | `core/llm/preTrialJudgePrompt.ts` |
| Zog Prompt | Zog 对话系统 | `core/llm/zogPrompt.ts` |

### 验收标准

- [x] 可配置 API Key (SiliconFlow/OpenAI/Claude)
- [x] Character Agent 生成对话
- [x] Judge Agent 评估动作
- [x] Pre-Trial Judge 审查上帝指令
- [x] Zog 对话系统正常工作

---

## 9. Phase 8: 数据持久化

### 任务清单

| 任务 | 描述 | 文件 |
|------|------|------|
| Zustand Persist | 状态持久化 | `stores/index.ts` |
| GameStorageAdapter | IndexedDB 适配器 | `core/storage/GameStorageAdapter.ts` |
| 多存储分离 | 按功能分离存储 | 独立 Store 配置 |

### 验收标准

- [x] 金币、等级正确保存
- [x] 刷新页面数据不丢失
- [x] API Key 安全存储
- [x] Zog 数据独立存储

---

## 10. Phase 9: 经验与挂机系统

### 任务清单

| 任务 | 描述 | 文件 |
|------|------|------|
| 经验系统 | 10 级经验阈值 | `features/zog/zogSlice.ts` |
| 零食商店 | SNACK_SHOP_ITEMS 配置 | `core/constants/index.ts` |
| 挂机收益 Hook | useIdleIncome Hook | `hooks/useIdleIncome.ts` |
| 零食消耗逻辑 | consumeSnack + addExp | `stores/index.ts`, `features/zog/zogSlice.ts` |
| 5 阶段性格映射 | Lv 1-10 → Stage 1-5 | `core/llm/zogPrompt.ts` |

### 验收标准

- [x] 经验初始为 0，上限 16369
- [x] 购买零食扣除金币并入库
- [x] 点击零食消耗增加经验值
- [x] 客厅挂机产出 10 G/分钟（好感度加成）
- [x] 竞技场产出 30 G/分钟（好感度加成）
- [x] 每 10 秒结算一次（金币截断处理）
- [x] 刷新页面经验和金币持久化

---

## 11. Phase 10: Zog 聊天系统

### 任务清单

| 任务 | 描述 | 文件 |
|------|------|------|
| 聊天窗口 UI | ZogChatWindow | `features/zog/components/ZogChatWindow.tsx` |
| 剧本生成 | LLM 生成日常剧本 | `features/zog/zogSlice.ts` |
| 经验判定 | 对话返回 expChange | `core/llm/zogPrompt.ts` |
| JSON 解析 | 聊天响应解析 | `ZogChatWindow.tsx` |

### 验收标准

- [x] 聊天窗口正常打开
- [x] LLM 对话正常工作
- [x] LLM 返回的 expChange 生效
- [x] 聊天历史正确保存

---

## 12. Phase 11: 商店与背包系统

### 任务清单

| 任务 | 描述 | 文件 |
|------|------|------|
| 商店页面 | ShopView | `pages/ShopView.tsx` |
| 背包页面 | InventoryView | `pages/InventoryView.tsx` |
| 物品分类 | 零食/战斗道具/潮牌 | `core/constants/index.ts` |
| 购买逻辑 | buyItem 方法 | `stores/index.ts` |

### 验收标准

- [x] 商店页面正常显示
- [x] 背包页面正常显示
- [x] 购买物品正确扣款
- [x] 物品正确入库

---

## 13. 后续优化 (P2)

| 功能 | 描述 |
|------|------|
| 更多场景 | 新增场景配置 |
| Electron 打包 | 桌面应用 |
| 音效系统 | 背景音、交互音效 |

---

## 14. 代码质量检查清单

每个 PR 提交前必须通过：

- [ ] `npm run build` 无错误
- [ ] `npm run type-check` 无警告
- [ ] 无 `console.log` 调试代码（除开发探针）
- [ ] 组件有文件头注释
- [ ] 复杂逻辑有 `// Why:` 注释
- [ ] TODO 标记格式正确

---

## 15. 里程碑

| 里程碑 | 目标 | 验收 |
|--------|------|------|
| M1 | 可运行的基础框架 | 能看到 Hub 和电视 |
| M2 | 完整的备战流程 | 能抽卡、注入、选场景 |
| M3 | 战斗核心循环 | 能进行 AI 对话战斗 |
| M4 | 完整可玩版本 | 能完成一场完整战斗 |
| M5 | 经验与挂机系统 | 零食喂养+挂机收益 |
| M6 | Zog 聊天系统 | 可与 Zog 对话 |
| M7 | 商店与背包系统 | 可购买和管理道具 |
