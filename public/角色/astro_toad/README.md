# Astro Toad 角色美术说明

## 这个文档管什么

这个文档记录 Astro Toad 的角色美术资源。它说明当前角色目录里有哪些动作资源、哪些资源已经接入游戏、资源命名应该怎么保持一致，以及后续调整 anchor、scale、经纪人页站位时应该去哪里改。这个目录目前用于 Astro Toad 的 Pixi 角色立绘动画，不记录数值、战斗逻辑或商店逻辑。

## 当前资源

- `idle/astro_toad_idle.png`
- `idle/astro_toad_idle.json`
- `idle/astro_toad_idle.manifest.json`
- `attack/astro_toad_attack.png`
- `attack/astro_toad_attack.json`
- `attack/astro_toad_attack.manifest.json`

当前 `idle` 和 `attack` 已接入经纪人面板 Pixi 演员立绘层。点击立绘区域会从非 `idle` / 非 `dead` 动作里随机选一个播放；现在只有 `attack`，所以点击会播放 attack，播完回 idle。

## 调整位置

经纪人面板里的 Pixi 容器位置调 `BrokerOfficePage.tsx` 的 `BROKER_ACTOR_PIXI_SLOT`。

Astro Toad 自己的 anchor、显示尺寸和 scale 调 `src/features/actors/renderer/actorArtRegistry.ts` 里的 `astro_toad.animations.*.brokerPortrait`。
