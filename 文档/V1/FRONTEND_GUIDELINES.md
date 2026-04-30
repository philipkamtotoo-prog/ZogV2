# 前端设计规范 (FRONTEND_GUIDELINES)

---

## 1. 设计哲学

**关键词**：Lo-Fi Sci-Fi、Cozy Dystopia、Retro CRT、Modern Minimal。

**隐喻**：高科技界面显示在破旧但有趣的显示器上。

**设计定位**：比传统终端更柔和，比现代UI更复古。

---

## 2. 配色系统

### 2.1 核心色彩

| 角色     | 变量名                    | 色值                      | 用途             |
| ------ | ---------------------- | ----------------------- | -------------- |
| **背景** | `--color-void`         | `#0b0e14`               | 主背景、深空黑        |
|        | `--color-card`         | `#1a1f2e`               | 卡片/面板背景        |
|        | `--color-crt-scanline` | `rgba(18, 16, 16, 0.5)` | CRT 扫描线叠加      |
| **文字** | `--color-primary`      | `#e2e8f0`               | 主文字、Slate 200  |
|        | `--color-muted`        | `#94a3b8`               | 辅助文字、Slate 400 |
|        | `--color-terminal`     | `#00ff41`               | 终端绿、战斗日志       |
| **强调** | `--color-cyan`         | `#4cc9f0`               | 交互按钮、链接        |
|        | `--color-pink`         | `#f72585`               | 警示、暴击、危险       |
|        | `--color-yellow`       | `#ffee00`               | 金币、警告、重要       |
|        | `--color-zog`          | `#a3e635`               | Zog 主题色、友好     |

### 2.2 Tailwind 映射

```css
/* globals.css */
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

**Tailwind 使用**：

```tsx
<div className="bg-void text-primary">主背景</div>
<div className="bg-card text-cyan">卡片</div>
<div className="text-terminal">战斗日志</div>
```

---

## 3. 字体系统

| 用途    | 字体             | 权重                    |
| ----- | -------------- | --------------------- |
| UI 文本 | Inter          | 400 / 500 / 600 / 700 |
| 终端/代码 | JetBrains Mono | 400 / 500 / 600       |
| 游戏标题  | Inter (Bold)   | 700                   |

### 3.1 字号规范

| 层级      | 字号   | class       | 用途     |
| ------- | ---- | ----------- | ------ |
| Display | 48px | `text-5xl`  | 页面大标题  |
| H1      | 36px | `text-4xl`  | 游戏标题   |
| H2      | 24px | `text-3xl`  | 区域标题   |
| H3      | 20px | `text-xl`   | 卡片标题   |
| Body    | 16px | `text-base` | 正文、按钮  |
| Caption | 14px | `text-sm`   | 辅助说明   |
| Meta    | 12px | `text-xs`   | 元信息、标签 |

---

## 4. 组件规范

### 4.1 按钮

```tsx
// Primary Button
<button className="
  px-4 py-2
  bg-cyan text-void
  font-mono uppercase tracking-wider
  hover:bg-cyan/80
  active:scale-95
  transition-all
">
  Action
</button>

// Secondary Button
<button className="
  px-4 py-2
  border border-slate-600
  text-primary
  font-mono uppercase
  hover:border-cyan hover:text-cyan
  transition-colors
">
  Cancel
</button>

// Danger Button
<button className="
  px-4 py-2
  border border-pink text-pink
  hover:bg-pink hover:text-void
  transition-colors
">
  Delete
</button>
```

### 4.2 卡片

```tsx
<div className="
  bg-card
  border border-slate-700
  rounded-md
  p-4
">
  {/* 内容 */}
</div>
```

### 4.3 输入框

```tsx
<input className="
  w-full
  px-4 py-2
  bg-void
  border border-slate-700
  text-primary
  placeholder:text-muted
  focus:border-cyan focus:outline-none
  font-mono
" />
```

---

## 5. CRT 效果规范

### 5.1 应用范围

| 区域       | CRT 效果 |
| -------- | ------ |
| 电视画面（战斗） | ✅ 启用   |
| 电视待机画面   | ✅ 启用   |
| 客厅主界面    | ❌ 不启用  |
| 全局覆盖     | ❌ 不启用  |

### 5.2 CRT 组件

```tsx
// src/components/common/CRTOverlay.tsx
interface CRTOverlayProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function CRTOverlay({ children, enabled = true }: CRTOverlayProps) {
  if (!enabled) return <>{children}</>;

  return (
    <div className="relative">
      {/* 内容 */}
      <div className="relative z-10">{children}</div>

      {/* 扫描线 */}
      <div className="
        pointer-events-none fixed inset-0 z-50
        bg-gradient-to-b from-transparent via-[rgba(18,16,16,0.3)] to-transparent
        bg-[length:100%_4px]
      />

      {/* 暗角 */}
      <div
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.6) 100%)'
        }}
      />
    </div>
  );
}
```

### 5.3 终端文字效果

```tsx
// 战斗日志样式
<div className="
  font-mono
  text-terminal
  text-shadow-[0_0_5px_var(--color-terminal)]
  leading-relaxed
">
  {content}
</div>
```

---

## 6. 布局系统

### 6.1 桌面布局 (PC)

```
┌─────────────────────────────────────────────────────────────────┐
│                           Header                                 │
│  ┌─────────┐                              ┌─────────────────┐   │
│  │ 金币:100 │                              │ 设置按钮         │   │
│  └─────────┘                              └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐ │
│  │                        │  │                                 │ │
│  │       Zog 区域          │  │          电视区域                │ │
│  │       (1/3)            │  │          (2/3)                  │ │
│  │                        │  │                                 │ │
│  │  [Spine 动画容器]      │  │     [CRT 容器内]                │ │
│  │                        │  │                                 │ │
│  └─────────────────────────┘  └─────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         Navigation                               │
│     [冰箱]    [收音机]    [门]    [聊天]    [电视]              │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 电视全屏模式

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │                    CRT 容器 (扫描线 + 暗角)                   │ │
│  │                                                             │ │
│  │    ┌─────────────────────────────────────────────────┐     │ │
│  │    │                                                 │     │ │
│  │    │              战斗画面区域                          │     │ │
│  │    │                                                 │     │ │
│  │    └─────────────────────────────────────────────────┘     │ │
│  │                                                             │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │              干预输入框 (底部固定)                   │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 响应式设计

### 7.1 断点

| 断点  | 宽度     | 前缀    |
| --- | ------ | ----- |
| sm  | 640px  | `sm:` |
| md  | 768px  | `md:` |
| lg  | 1024px | `lg:` |
| xl  | 1280px | `xl:` |

### 7.2 移动端适配

```tsx
// 默认移动优先
<div className="
  flex-col
  md:flex-row
">
  <div className="w-full md:w-1/3">Zog</div>
  <div className="w-full md:w-2/3">TV</div>
</div>
```

---

## 8. 动画规范

### 8.1 预定义动画

| 动画名 | CSS 类 | 用途 |
|----------|------------------|------|
| Fade In | `animate-fade-in` | 元素出现 |
| Pulse | `animate-pulse` | 加载状态 |
| Bounce | `animate-bounce` | 提示动画 |
| Typewriter | `animate-typewriter` | 打字机效果 |

### 8.2 CSS 动画使用

```tsx
// 元素出现动画
<div className="animate-fade-in">
  {children}
</div>

// 打字机效果 (使用 Typewriter 组件)
import { Typewriter } from '../components/ui/Typewriter';
<Typewriter text={content} speed={50} />
```

> **注意**: 当前实现使用纯 CSS 动画替代 Framer Motion。

---

## 9. 图标规范

- **图标库**：推荐使用 Lucide React
- **风格**：线性图标，与整体复古风格统一
- **颜色**：继承父元素文字颜色

```tsx
import { Settings, Volume2, User } from 'lucide-react';

<Settings className="w-5 h-5 text-muted hover:text-cyan" />
```

---

## 10. UI 组件清单

| 组件         | 路径                                 | 说明     |
| ---------- | ---------------------------------- | ------ |
| Button     | `components/common/Button.tsx`     | 按钮变体   |
| Input      | `components/common/Input.tsx`      | 输入框    |
| Modal      | `components/common/Modal.tsx`      | 弹窗     |
| Toast      | `components/common/Toast.tsx`      | 提示     |
| CRTOverlay | `components/common/CRTOverlay.tsx` | CRT 效果 |
| CoinWidget | `components/common/CoinWidget.tsx` | 金币显示   |

## 11. 自定义 Hooks

| Hook | 路径 | 说明 |
|------|------|------|
| useIdleIncome | `hooks/useIdleIncome.ts` | 挂机收益 Hook，根据场景自动产出金币 |

---

## 12. 页面路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `SplashScreen` | 启动页 |
| `/hub` | `HubView` | 客厅主页 |
| `/shop` | `ShopView` | 银河百货商店 |
| `/inventory` | `InventoryView` | 背包/仓库 |
| `/arena` | `ArenaView` | 竞技场战斗 |
| `/agent` | `AgentDashboard` | 演员管理面板 |

### 12.1 路由配置

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HubView } from './pages/HubView';
import { ShopView } from './pages/ShopView';
import { InventoryView } from './pages/InventoryView';
import { ArenaView } from './pages/ArenaView';
import { AgentDashboard } from './pages/AgentDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/hub" element={<HubView />} />
        <Route path="/shop" element={<ShopView />} />
        <Route path="/inventory" element={<InventoryView />} />
        <Route path="/arena" element={<ArenaView />} />
        <Route path="/agent" element={<AgentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 12.2 页面布局

| 页面 | 布局 | 特殊说明 |
|------|------|----------|
| HubView | 左侧 Zog + 右侧电视 | 全局状态栏 |
| ShopView | 单列卡片布局 | 商店购买 |
| InventoryView | 网格布局 | 物品管理 |
| ArenaView | CRT 全屏容器 | 战斗画面 |
| AgentDashboard | 表格+详情弹窗 | 演员管理 |
