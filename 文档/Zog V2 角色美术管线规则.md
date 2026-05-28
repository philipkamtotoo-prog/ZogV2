# Zog V2 角色美术管线规则

## 这个文档管什么

这份文档规定“角色美术资源怎么放、怎么命名、怎么接进游戏、谁负责调位置”。它是给开发者和 Codex 一起看的核心规则；以后新增角色、补动作、换皮、改 Pixi 立绘位置，都先按这里来。

## 总原则

角色资产按“角色”管理，不按“动作类型”管理。

推荐结构：

```text
public/角色/{actorId}/
  README.md
  idle/
    {actorId}_idle.png
    {actorId}_idle.json
    {actorId}_idle.manifest.json
  attack/
    {actorId}_attack.png
    {actorId}_attack.json
    {actorId}_attack.manifest.json
```

原因很简单：一个角色的 anchor、缩放、站位、换皮和动作风格是一组东西，放在同一个角色目录下最容易维护。动作只是角色下面的子资源。

## 命名规则

`actorId` 必须和程序里的角色 id 一致，比如 `astro_toad`。

文件名使用：

```text
{actorId}_{animationKey}.png
{actorId}_{animationKey}.json
{actorId}_{animationKey}.manifest.json
```

目录名也尽量使用 `actorId`。如果临时目录名还没改，必须在程序的角色美术 registry 里显式写清楚路径，不允许在页面组件里硬编码资源路径。

## Manifest 规则

每个动作目录都应该有一个 `.manifest.json`，至少写清楚：

```json
{
  "actorId": "astro_toad",
  "animationKey": "idle",
  "fps": 12,
  "loop": true,
  "anchor": { "x": 0.5, "y": 1 },
  "json": "astro_toad_idle.json",
  "sheet": "astro_toad_idle.png"
}
```

`actorId`、`json`、`sheet` 不能还留着旧角色名。文件改名后，manifest 和 spritesheet json 里的 `meta.image` 也要一起改。

## 程序接入规则

角色美术只从 `src/features/actors/renderer/actorArtRegistry.ts` 注册。

React 页面只负责放容器，例如经纪人页的 Pixi 演员立绘槽位。Pixi Application、spritesheet 加载、动画播放、角色缩放和销毁都放在 `src/features/actors/renderer/runtime/`。

不要在页面组件里直接 `fetch('/角色/...')`，也不要把 Pixi 对象塞进 React 状态。

## 位置调整规则

页面级容器位置只调页面里的 slot 常量，比如经纪人页的 `BROKER_ACTOR_PIXI_SLOT`。

角色自己的站位、anchor、最大显示尺寸、scale，调 `actorArtRegistry.ts` 里的 `brokerPortrait`。这样换角色时不会把页面布局和角色调参搅在一起。

## 动作衔接规则

`idle` 是默认待机动作。用户交互触发的动作从同一角色已注册的动作里随机选，但排除 `idle` 和 `dead`。

一次性动作，比如 `attack`、`hurt`、`taunt`，在 registry 里设为 `loop: false`，播完自动回 `idle`。

如果动作之间位置跳动，优先检查三件事：

1. 每个动作 spritesheet 的画布尺寸是否一致。
2. 每个动作 manifest 的 `anchor` 是否一致。
3. `actorArtRegistry.ts` 中同一角色不同动作的 `brokerPortrait` 是否一致。

如果动作本身需要冲出去再回来，应该在动画帧里完成，不要在 React 页面里给不同动作写不同容器位置。

## 角色目录文档规则

每个角色目录里的文档，比如 `README.md`、制作说明、动作说明，开头都必须先写一段“这个文档管什么”。

这段备注要具体说明：

- 这个文档服务哪个角色。
- 记录哪些资源或动作。
- 哪些参数可以改，哪些参数不要随便改。
- 如果资源还没接进游戏，要写清楚当前状态。

推荐开头：

```md
## 这个文档管什么

这个文档记录 astro_toad 的角色美术资源。它说明 idle/attack 等动作目录放什么文件、当前哪些动作已接入游戏、anchor/scale/站位在哪里调整，以及新增资源时不能改错哪些名字。
```

## 新增角色检查表

1. 角色目录使用 `actorId`。
2. 动作目录使用 `idle`、`attack` 这类稳定英文 key。
3. png、json、manifest 三个文件名一致。
4. manifest 里的 `actorId`、`json`、`sheet` 正确。
5. spritesheet json 的 `meta.image` 指向正确 png。
6. 在 `actorArtRegistry.ts` 注册资源。
7. 在目标 Pixi runtime 里只读 registry，不硬编码路径。
8. 跑一次构建和页面检查。
