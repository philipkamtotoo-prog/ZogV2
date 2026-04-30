/**
 * BattleScene - Pixi 战场场景，管理 4 层舞台
 *
 * 层级结构：
 * - BackgroundLayer: 背景层（arena 底色）
 * - ActorLayer: 角色层（角色 sprite、座位标记）
 * - EffectLayer: 特效层（飘字、banner、状态图标）
 * - OverlayLayer: 覆盖层（导演广播、全局效果）
 */

import { Container } from 'pixi.js';
import type { BattleRenderBootstrap, RenderOp } from '../battleRenderBootstrap';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { ActorLayer } from './layers/ActorLayer';
import { EffectLayer } from './layers/EffectLayer';
import { OverlayLayer } from './layers/OverlayLayer';

export class BattleScene {
  readonly stage: Container;
  readonly backgroundLayer: BackgroundLayer;
  readonly actorLayer: ActorLayer;
  readonly effectLayer: EffectLayer;
  readonly overlayLayer: OverlayLayer;

  private width: number;
  private height: number;

  constructor(stage: Container) {
    this.stage = stage;
    this.width = 800;
    this.height = 600;

    this.backgroundLayer = new BackgroundLayer();
    this.actorLayer = new ActorLayer();
    this.effectLayer = new EffectLayer();
    this.overlayLayer = new OverlayLayer();

    stage.addChild(this.backgroundLayer.container);
    stage.addChild(this.actorLayer.container);
    stage.addChild(this.effectLayer.container);
    stage.addChild(this.overlayLayer.container);

    this.layout();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.layout();
    this.backgroundLayer.resize(width, height);
    this.actorLayer.resize(width, height);
  }

  private layout(): void {
    // 布局：actor 层占中心区域，effect 层叠加在上，overlay 层覆盖全屏
    const arenaTop = 60;
    const arenaBottom = this.height - 60;
    const arenaHeight = arenaBottom - arenaTop;

    this.backgroundLayer.container.y = arenaTop;
    this.backgroundLayer.resize(this.width, arenaHeight);

    this.actorLayer.container.y = arenaTop;
    this.actorLayer.resize(this.width, arenaHeight);

    this.effectLayer.container.y = arenaTop;
    this.effectLayer.resize(this.width, arenaHeight);

    this.overlayLayer.container.y = 0;
    this.overlayLayer.resize(this.width, this.height);
  }

  bootstrap(bootstrap: BattleRenderBootstrap): void {
    this.actorLayer.bootstrap(bootstrap);
    this.backgroundLayer.setTotalDodos(bootstrap.scene.totalDodos);
  }

  executeOps(ops: RenderOp[]): void {
    for (const op of ops) {
      switch (op.type) {
        case 'ACTOR_SPEAK':
          this.effectLayer.showSpeechBubble(op.actorId, op.text);
          break;
        case 'ACTOR_MOVE':
          this.actorLayer.playMove(op.actorId, op.style);
          break;
        case 'DAMAGE_NUMBER':
          this.effectLayer.showDamage(op.targetId, op.amount);
          break;
        case 'HEAL_NUMBER':
          this.effectLayer.showHeal(op.targetId, op.amount);
          break;
        case 'STATUS_BADGE':
          this.effectLayer.showStatusBadge(op.targetId, op.status, op.added);
          break;
        case 'ITEM_CAST':
          this.effectLayer.showItemCast(op.targetId, op.itemId, op.source, op.actorId);
          break;
        case 'BROADCAST_BANNER':
          this.overlayLayer.showBroadcast(op.text);
          break;
        case 'REPORTER_BANNER':
          this.overlayLayer.showReporter(op.text, op.severity);
          break;
        case 'MUTATION_FLASH':
          this.overlayLayer.showMutation(op.mutationName);
          break;
        case 'PROMPT_SIGNAL':
          this.actorLayer.showPromptSignal(op.actorId, op.source);
          break;
        case 'ZOG_REACTION':
          this.overlayLayer.showZog(op.text);
          break;
      }
    }
  }

  destroy(): void {
    this.stage.removeChildren();
    this.backgroundLayer.destroy();
    this.actorLayer.destroy();
    this.effectLayer.destroy();
    this.overlayLayer.destroy();
  }
}
