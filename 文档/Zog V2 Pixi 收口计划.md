# Zog V2 Pixi 收口计划

## 1. 目标

这一阶段的目标不是做完正式美术，而是把战斗表现层收口到可替换、可扩展、可外包的 Pixi 架构上。

本阶段完成后应满足：

1. `BattlePage` 内有一个稳定可挂载的 Pixi 战斗舞台。
2. Pixi 只消费表现层协议，不参与 HP、金币、道具、胜负、结算的计算。
3. 现有 React 调试 UI 继续保留，方便开发和 debug。
4. 后续批量替换美术资源时，只需要改资源和 sprite 实现，不需要再碰战斗逻辑。

## 2. 当前代码状态

当前仓库现状：

- `src/features/battle/display/displayTypes.ts` 已经有 `DisplayEvent` discriminated union，可作为表现协议起点。
- `src/features/battle/display/displayMapper.ts` 已经能把 `BattleEvent` 映射成 `DisplayEvent`。
- `src/features/battle/battleStore.ts` 已经维护 `displayLog: DisplayEvent[]`。
- `src/engine/battleEngine.ts` 已经会把普通战斗、玩家道具、广播、ReporterMemory 推进 display 队列。
- `src/features/battle/components/BattlePage.tsx` 目前仍是纯 React 页面。
- `src/features/battle/renderer/` 目录目前是空的。
- `package.json` 目前还没有 Pixi 依赖。

这说明：

- 表现协议已经初步成型。
- Pixi runtime 还没有落地。
- 现在最适合做的是“架构收口 + 占位表现 + React/Pixi 边界冻结”。

## 3. 总原则

所有外包 agent 必须遵守以下规则：

1. Pixi 是纯表现层，不计算战斗结果。
2. Pixi 不直接修改 Zustand store，不直接修改 battle engine state。
3. Pixi 不读取金币、账单、下注结算、胜负判定来做业务决策。
4. Pixi 只吃两类输入：
   - 一份开局静态 bootstrap 数据
   - 一条增量 `DisplayEvent` 事件流
5. `DisplayEvent` 是 React 和 Pixi 的共用合同，不能让 Pixi 去读 `BattleEvent`。
6. 现阶段不把所有 UI 搬进 Pixi。
7. 现阶段允许使用占位图形、纯色块、文字标签、简单粒子，不阻塞后续美术替换。
8. 所有资源路径统一走 registry，不允许在 sprite 组件里硬编码路径。
9. 所有 Pixi 对象必须有完整销毁流程，避免重复挂载后内存泄漏。
10. 如果必须改 `DisplayEvent` 合同，先改合同和测试，再改 runtime，不允许边写边猜。

## 4. 范围

### 4.1 本阶段要做

- 在战斗页挂载 Pixi canvas
- 做 battle scene 的基础层级
- 让 Pixi 能消费 `DisplayEvent`
- 做 12 种 `DisplayEvent` 的占位表现
- 保留 React 的控制区和调试区
- 做基础测试和回退机制

### 4.2 本阶段不做

- 正式美术资源批量接入
- 完整角色骨骼动画系统
- 客厅 Pixi 化
- 把 HP、分数板、账单、下注区全部搬进 Pixi
- 改战斗数值、提示词、LLM 逻辑
- 用 Pixi 直接接管结算页

## 5. 架构决定

### 5.1 采用 React Host + Imperative Pixi Runtime

本阶段不引入 `@pixi/react`。

原因：

- 当前项目已经是 React + Zustand，做一个薄的 React Host 最稳。
- 事件流驱动更适合 imperative runtime。
- 外包 agent 更容易理解和排查。
- 后续替换美术资源时，runtime 控制权更集中。

依赖建议：

- 新增 `pixi.js`

### 5.2 Pixi 输入边界

Pixi 只接收下面两个输入：

#### A. `BattleRenderBootstrap`

只在战斗开局创建一次。

建议定义：

```ts
export interface BattleRenderBootstrap {
  battleId: string;
  battleSeed: string;
  actorSlots: Array<{
    actorId: string;
    name: string;
    seatIndex: number;
    maxHP: number;
    assetKey?: string;
  }>;
  scene: {
    totalDodos: number;
  };
  selectedMutationId?: string;
}
```

#### B. `DisplayEvent[]`

增量事件流，来自 `battleStore.displayLog`。

Pixi runtime 内部自己维护已消费游标，不反向污染 store。

### 5.3 内部再拆一层 `RenderOp`

不要让每个 sprite 直接理解完整 `DisplayEvent`。

建议在 Pixi 内部增加：

```ts
type RenderOp =
  | { type: 'ACTOR_SPEAK'; actorId: string; text: string }
  | { type: 'ACTOR_MOVE'; actorId: string; style: 'minor' | 'attack' | 'hit' | 'eliminated' }
  | { type: 'DAMAGE_NUMBER'; targetId: string; amount: number }
  | { type: 'HEAL_NUMBER'; targetId: string; amount: number }
  | { type: 'STATUS_BADGE'; targetId: string; status: string; added: boolean }
  | { type: 'ITEM_CAST'; targetId: string; itemId: string; source: 'PLAYER' | 'ACTOR' }
  | { type: 'BROADCAST_BANNER'; text: string }
  | { type: 'REPORTER_BANNER'; text: string; severity: number }
  | { type: 'MUTATION_FLASH'; mutationName: string }
  | { type: 'PROMPT_SIGNAL'; actorId: string; source: 'PERMANENT' | 'EPISODE' }
  | { type: 'ZOG_REACTION'; text: string };
```

`DisplayEvent -> RenderOp` 是 Pixi 层自己的桥接，不要回写到 battle core。

### 5.4 补充决议

以下 4 条作为正式冻结决议，外包 agent 不再自行决定：

#### A. `seatIndex` 不进入 core

`BattleRenderBootstrap.actorSlots[].seatIndex` 由 `battleRenderBootstrap.ts` 在 battle 开局时按 `battleState.actors` 的数组顺序一次性计算。

规则：

- `seatIndex = actors` 在该局开场时的 index
- 整局冻结，不随 HP、淘汰、initiative、UI 排序变化而变化
- 不给 `BattleState` / `ActorCombatState` 新增 `seatIndex` 字段

原因：

- Pixi 需要稳定座位号
- battle core 不需要知道座位概念
- 避免为了表现层污染 core 类型

#### B. `ITEM.actorId` 的正式语义

`DisplayEvent.kind === 'ITEM'` 时：

- 如果 `source === 'PLAYER'`，则 `actorId = undefined`
- 如果 `source === 'ACTOR'`，则 `actorId` 必须存在

Pixi 路径规则：

- `source === 'PLAYER' && actorId === undefined`
  - 走“从屏幕边缘或控制台飞入目标”的动画
- `source === 'ACTOR' && actorId 存在`
  - 走“演员对演员施放”的动画

不允许使用空字符串表达玩家来源。

#### C. `PROMPT` 直接复用现有字段

`DisplayEvent.kind === 'PROMPT'` 直接映射为：

```ts
{ type: 'PROMPT_SIGNAL'; actorId: string; source: 'PERMANENT' | 'EPISODE' }
```

规则：

- `actorId` 决定对哪个角色播放信号脉冲
- `source` 决定视觉样式差异
- 不新增 prompt target 字段
- 不从 battle core 再额外推导一次目标

#### D. `displayLog` 允许 React / Pixi 双 consumer 共存

`battleStore.displayLog` 保持为单一事实来源，React 和 Pixi 共同只读。

规则：

- React `DisplayLog` 继续消费全量 `displayLog`
- Pixi `DisplayEventPlayer` 只维护本地 `lastConsumedIndex`
- Pixi 只读取 `[lastConsumedIndex, displayLog.length)` 的增量
- Pixi 不修改 `displayLog`
- Pixi 不做 dequeue / splice / truncate
- Pixi 不回写 store 中的消费游标

这意味着：

- React 和 Pixi 不会互相踩队列
- battle store 仍然只有一个表现事实源
- Pixi 播放失败也不会破坏 React debug 能力

#### E. 两条隐藏执行规则

1. `seatIndex` 只能在 bootstrap 创建时计算一次，不能每帧重新 `findIndex`
2. Pixi 的 `lastConsumedIndex` 必须和 `battleId` 绑定重置

重置时机：

- 新 battle
- reroll 后新 engine
- 返回客厅再开一局

不重置的时机：

- 暂停
- 恢复
- AUTO / MANUAL 切换

## 6. 目录建议

建议新增：

```text
src/features/battle/renderer/
  BattlePixiCanvas.tsx
  battleRenderBootstrap.ts
  displayEventToRenderOp.ts
  runtime/
    BattlePixiRuntime.ts
    BattleScene.ts
    DisplayEventPlayer.ts
    layers/
      BackgroundLayer.ts
      ActorLayer.ts
      EffectLayer.ts
      OverlayLayer.ts
    sprites/
      ActorSprite.ts
      DodoSprite.ts
      StatusBadgeSprite.ts
    effects/
      FloatingNumber.ts
      BroadcastBanner.ts
      ReporterBanner.ts
      MutationFlash.ts
    assets/
      assetRegistry.ts
      placeholderAssets.ts
```

现有文件保留：

- `src/features/battle/components/BattlePage.tsx`
- `src/features/battle/components/DisplayLog.tsx`
- `src/features/battle/components/ActorPanel.tsx`
- `src/features/battle/components/DodoScoreboard.tsx`
- `src/features/battle/components/CommandInput.tsx`
- `src/features/battle/components/ItemPanel.tsx`

这些 React 组件本阶段继续作为 debug HUD。

## 7. DisplayEvent 到占位表现的映射

第一版表现要求：

- `ACTOR_LINE`
  - 角色头顶气泡，1.5s 自动消失
- `ACTOR_ACTION`
  - 轻微位移或摇晃，加一条短文案
- `DAMAGE`
  - 目标闪红、抖动、红色伤害数字
- `HEAL`
  - 目标发绿、绿色数字
- `STATUS`
  - 状态图标或文字 badge 飘入/飘出
- `ELIMINATION`
  - 角色灰掉、下沉或淡出
- `ITEM`
  - 从屏幕边缘或控制台位置飞出一个占位道具图标到目标
- `BROADCAST`
  - 顶部导演广播横幅
- `REPORTER`
  - 底部或中上方记者快讯条
- `MUTATION`
  - 全屏色彩闪烁 + 规则名称
- `PROMPT`
  - 角色头顶信号脉冲
- `ZOG`
  - 结尾字幕式短句，或电视机抖一下

## 8. 页面集成策略

`BattlePage` 的改法要保守：

1. 把 Pixi canvas 插入到主战斗区域。
2. React 的 `DisplayLog` 保留。
3. React 的 `ActorPanel` 保留。
4. React 的 `CommandInput`、`ItemPanel`、`DodoScoreboard` 保留。
5. 如果 Pixi 初始化失败，页面仍然能继续用 React 版本跑战斗。

建议布局：

- 左中区域：Pixi canvas
- 左下或旁边：DisplayLog
- 顶部：BattleControls
- 右侧：DodoScoreboard
- 底部：CommandInput + ItemPanel

## 9. 开发顺序

### Phase P0 - 合同冻结

目标：

- 把 bootstrap 结构定下来
- 确认 Pixi 只吃 bootstrap + `DisplayEvent[]`
- 不让外包 agent 擅自去改 battle core

交付：

- `battleRenderBootstrap.ts`
- `DisplayEvent` 使用规则写进注释或文档

### Phase P1 - Pixi Runtime 基建

目标：

- 装 `pixi.js`
- 建立 `BattlePixiCanvas.tsx`
- 建立 mount / resize / destroy 流程
- 搭出 4 层舞台

交付：

- 能看到一个占位 arena
- 能看到 5 个角色占位 sprite
- 重进战斗不会泄漏，不会重复叠 canvas

### Phase P2 - Event Player

目标：

- 把 `displayLog` 的新增事件喂给 Pixi
- runtime 维护本地消费游标
- `DisplayEvent -> RenderOp -> animation/effect`

交付：

- 普通战斗时能连续播放表现
- 不重复消费旧事件
- 暂停/继续不会把旧事件重播成灾难

### Phase P3 - 12 类事件占位表现补齐

目标：

- 所有 `DisplayEventKind` 都有最小可视表现

交付：

- 每一种 `kind` 都能在战斗中看见明显反馈
- 没有 “收到事件但舞台无反应” 的空洞

### Phase P4 - BattlePage 收口

目标：

- 保持 React 控制面板
- 让 Pixi 成为主视觉区
- 有 fallback 和 debug 模式

交付：

- 页面结构稳定
- 不影响现在的 debug 体验

### Phase P5 - 测试与验收

目标：

- build 过
- tests 过
- 关键流程可人工验收

交付：

- 单测补齐
- 验收清单走通

## 10. 外包分包建议

### Agent A - Pixi 基建负责人

拥有文件：

- `package.json`
- `src/features/battle/renderer/BattlePixiCanvas.tsx`
- `src/features/battle/renderer/runtime/*`
- `src/features/battle/renderer/battleRenderBootstrap.ts`

任务：

- 安装 `pixi.js`
- 做 React Host
- 做 Pixi runtime 生命周期
- 做 resize / destroy / fallback
- 建立基础图层

不要改：

- `core/battle/*`
- 赔率、数值、结算逻辑
- ReporterMemory 规则

完成标准：

- canvas 能挂上
- 卸载干净
- battle 可持续运行

### Agent B - DisplayEvent 播放负责人

拥有文件：

- `src/features/battle/renderer/displayEventToRenderOp.ts`
- `src/features/battle/renderer/runtime/DisplayEventPlayer.ts`
- `src/features/battle/renderer/runtime/effects/*`

任务：

- 只处理 `DisplayEvent -> RenderOp -> 播放`
- 做 12 种事件的占位效果

不要改：

- `battleEngine.ts`
- `displayMapper.ts`
- `BattlePage.tsx`

完成标准：

- 12 类事件都有反应
- 不重复消费
- 播放失败不会打断主战斗

### Agent C - Sprite 与资产负责人

拥有文件：

- `src/features/battle/renderer/runtime/sprites/*`
- `src/features/battle/renderer/runtime/assets/*`

任务：

- 做角色占位 sprite
- 做 badge、banner、飘字占位资产
- 建 asset registry
- 保证后续替换真实美术时改动集中

不要改：

- battle store
- 结算页
- LLM 逻辑

完成标准：

- 所有占位资源从 registry 取
- 没有组件内路径硬编码
- 后续美术替换只动 assets/sprites

### Agent D - 页面接入与测试负责人

拥有文件：

- `src/features/battle/components/BattlePage.tsx`
- 必要的 battle renderer tests
- 必要的 smoke tests

任务：

- 把 Pixi canvas 接到 `BattlePage`
- 保留 React debug HUD
- 补最小测试

不要改：

- battle rules
- reporter rules
- 资产 registry

完成标准：

- 页面布局稳定
- 无 Pixi 时仍可 fallback
- build/test 通过

## 11. 并行和顺序

正确顺序：

1. 先由负责人定 `BattleRenderBootstrap` 和 renderer public API
2. Agent A 先完成 runtime 壳子
3. Agent C 可以并行做 sprites/assets
4. Agent B 在 runtime API 稳定后接事件播放
5. Agent D 最后接页面和测试

不要并行改同一个文件：

- `BattlePage.tsx`
- `displayTypes.ts`
- `battleStore.ts`
- `battleEngine.ts`

## 12. 红线

以下内容不允许外包 agent 自行决定：

1. 改 `DisplayEvent` 含义
2. 改 battle engine 业务逻辑
3. 改数值、赔率、奖励、退款
4. 改 ReporterMemory 事实边界
5. 把 React 控制区直接删掉
6. 为了省事让 Pixi 直接读 `BattleEvent`

## 13. 验收标准

功能验收：

1. 进入战斗页能看到 Pixi 舞台
2. 战斗开始后角色有基础存在感，不是纯黑框
3. `DAMAGE / HEAL / ELIMINATION / ITEM / BROADCAST / REPORTER` 至少有肉眼可见反馈
4. 节目结束不会因为 Pixi 报错卡死结算
5. 返回客厅后不会残留旧 canvas

工程验收：

1. `npm run build` 通过
2. `npm test -- --run` 通过
3. 没有把 battle 业务逻辑塞进 renderer
4. 没有资源路径硬编码散落
5. 新文件集中在 `src/features/battle/renderer/`

## 14. 建议你发给外包 agent 的一句话版本

“按 `文档/Zog V2 Pixi 收口计划.md` 执行。先把 Pixi battle stage 跑起来，保持 React 控制区不动。Pixi 只吃 `BattleRenderBootstrap + DisplayEvent[]`，不碰战斗逻辑。先用占位图形把 12 类 DisplayEvent 都跑通，再考虑替换正式美术资源。”  
