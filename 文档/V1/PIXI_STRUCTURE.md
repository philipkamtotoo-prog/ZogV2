# PixiJS 美术渲染架构 (PIXI_STRUCTURE)

> 本文档记录《Alien TV》项目中 PixiJS 的接入规范、组件结构和资产管线。
> **核心原则**：PixiJS 仅为纯视觉渲染层，通过 Zustand subscribe 监听状态变化，单向数据流。

---

## 1. 目录结构

```
src/
├── components/
│   └── pixi/                     # PixiJS 渲染组件
│       ├── ZogCanvas.tsx         # Zog 客厅渲染画布
│       ├── BattleCanvas.tsx      # 战斗场景渲染画布
│       ├── common/
│       │   ├── BaseCanvas.tsx   # 基础画布组件（封装公共逻辑）
│       │   └── CanvasContainer.tsx
│       └── effects/
│           ├── CRTFilter.ts     # CRT 电视滤镜效果
│           └── ParticleEffect.tsx
│
├── core/
│   └── pixi/                     # PixiJS 核心工具
│       ├── textures/             # 纹理加载器
│       │   ├── TextureLoader.ts # 主加载器
│       │   └── types.ts
│       ├── sprites/             # 精灵工厂
│       │   ├── SpriteFactory.ts
│       │   └── ActorSprite.ts
│       └── animations/          # 动画系统
│           ├── AnimationManager.ts
│           └── Tween.ts
│
├── features/
│   └── pixi-hooks/              # Pixi 专用 Hooks
│       ├── usePixiApp.ts        # Application 实例管理
│       ├── useTextureLoader.ts  # 纹理加载 Hook
│       └── useAnimation.ts      # 动画 Hook
│
└── stores/
    └── index.ts                 # Zustand 主 Store（数据源）
```

---

## 2. 渲染层级 (Z-Index Order)

| 层级 | 组件 | 用途 |
|------|------|------|
| 0 | 背景层 | 静态背景图 |
| 1 | 场景层 | 房间/竞技场基础场景 |
| 2 | 角色层 | 演员/Zog 精灵 |
| 3 | 特效层 | 粒子/光效 |
| 4 | UI 层 | 血条/状态图标 |
| 5 | 覆盖层 | CRT 滤镜/扫描线 |

---

## 3. 纹理加载方案

### 3.1 静态贴图

```typescript
// 基础纹理预加载
const textures = await PIXI.Assets.load([
  '/assets/bg/hub.png',
  '/assets/characters/zog_idle.png',
  '/assets/items/battery.png',
]);
```

### 3.2 序列帧动画

```typescript
// 帧序列加载
const frameUrls = Array.from({ length: 8 }, (_, i) =>
  `/assets/animations/zog_eat/frame_${i}.png`
);
const frames = await PIXI.Assets.load(frameUrls);
```

---

## 4. 状态订阅模式

> **绝对红线**：PixiJS 内部只读取状态，不计算不修改

```typescript
// ✅ 正确：监听 Zustand 变化
useEffect(() => {
  const unsubscribe = useZogStore.subscribe(
    (state) => state.currentActivity,
    (activity) => {
      // 根据状态切换动画
      sprite.play(activity === 'EATING' ? 'eat' : 'idle');
    }
  );
  return () => unsubscribe();
}, []);


// ❌ 错误：在 Pixi 内部修改状态
app.ticker.add(() => {
  if (someCondition) {
    useGameStore.getState().addGold(100); // 禁止！
  }
});
```

---

## 5. 交互处理

```typescript
// 点击交互 -> 调用 Store Action
sprite.on('pointerdown', () => {
  useZogStore.getState().addExp(5, 'GIFT');
});
```

---

## 6. 安全销毁

```typescript
useEffect(() => {
  const app = new PIXI.Application();

  // ...

  return () => {
    // 完整销毁流程
    app.stage.removeChildren();
    app.renderer.destroy(true, true);
    app.destroy(true, { children: true, texture: true });
  };
}, []);
```

---

## 7. 已创建文件

| 文件 | 状态 | 说明 |
|------|------|------|
| [src/components/pixi/common/BaseCanvas.tsx](src/components/pixi/common/BaseCanvas.tsx) | ✅ | 基础画布组件 |
| [src/components/pixi/ZogCanvas.tsx](src/components/pixi/ZogCanvas.tsx) | ✅ | Zog 客厅画布示例 |
| [src/core/pixi/textures/TextureLoader.ts](src/core/pixi/textures/TextureLoader.ts) | ✅ | 纹理加载器 |

## 8. 待补充

- [x] 资产目录结构规划 (public/assets/)
- [x] AssetPaths.ts 路径字典
- [ ] 纹理图集 (Texture Atlas) 方案
- [ ] CRT 滤镜具体实现
- [ ] 粒子系统设计
- [ ] BattleCanvas 战斗画布

---

## 9. 资源管理规范

### 9.1 物理目录结构

```
public/assets/
├── zog/          # Zog 客厅角色相关
│   ├── sprites/  # 静态精灵图
│   ├── anim/     # 序列帧动画
│   └── items/    # 场景道具
├── hub/          # Hub 场景
│   ├── background/
│   ├── tv/
│   └── decor/
├── arena/        # 战斗场景
│   ├── background/
│   └── effects/  # 特效序列帧
└── ui/           # UI 通用资源
    ├── hp_bar.png
    ├── btn_*.png
    └── icon_*.png
```

### 9.2 路径字典（强制规范）

**所有 PixiJS 使用的美术资源必须且只能通过 `AssetPaths` 字典获取，禁止在组件里硬编码字符串路径。**

```typescript
// ✅ 正确：使用字典
import { ZOG_ASSETS } from '@/core/constants/AssetPaths';
const texture = await PIXI.Assets.load(ZOG_ASSETS.IDLE);

// ❌ 错误：硬编码路径
const texture = await PIXI.Assets.load('/assets/zog/sprites/idle.png');
```

**使用场景分类导入**：
- `ZOG_ASSETS` - Zog 客厅相关
- `HUB_ASSETS` - Hub 场景
- `ARENA_ASSETS` - 战斗场景
- `UI_ASSETS` - UI 元素

### 9.3 序列帧加载

使用 `generateFramePaths` 辅助函数：

```typescript
import { generateFramePaths, ZOG_ASSETS } from '@/core/constants/AssetPaths';

const eatFrames = generateFramePaths(ZOG_ASSETS.ANIM_EAT, 8);
const textures = await PIXI.Assets.load(eatFrames);
```
