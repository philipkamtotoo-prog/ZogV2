/**
 * ActorLayer - 角色层
 * 显示角色占位 sprite、座位标记、HP 条
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { BattleRenderBootstrap } from '../../battleRenderBootstrap';

interface ActorSlot {
  actorId: string;
  name: string;
  seatIndex: number;
  maxHP: number;
  hp: number;
  container: Container;
  hpBar: Graphics;
  nameText: Text;
  seatText: Text;
  eliminated: boolean;
}

export class ActorLayer {
  readonly container: Container;
  private actors: Map<string, ActorSlot> = new Map();
  private width = 800;
  private height = 480;

  constructor() {
    this.container = new Container();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.layoutActors();
  }

  bootstrap(bootstrap: BattleRenderBootstrap): void {
    // 清除旧角色
    this.actors.forEach((slot) => slot.container.destroy({ children: true }));
    this.actors.clear();

    // 创建新角色
    for (const actorData of bootstrap.actorSlots) {
      const slot = this.createActorSlot(actorData);
      this.actors.set(actorData.actorId, slot);
      this.container.addChild(slot.container);
    }

    this.layoutActors();
  }

  private createActorSlot(data: { actorId: string; name: string; seatIndex: number; maxHP: number }): ActorSlot {
    const c = new Container();

    // 角色占位框（圆形）
    const body = new Graphics();
    body.circle(0, 0, 30);
    body.fill({ color: 0x6a6aae });
    body.stroke({ color: 0x9a9aff, width: 2 });
    c.addChild(body);

    // 名字
    const nameStyle = new TextStyle({ fontFamily: 'Arial', fontSize: 12, fill: 0xffffff });
    const nameText = new Text({ text: data.name, style: nameStyle });
    nameText.anchor.set(0.5, 0);
    nameText.y = 35;
    c.addChild(nameText);

    // 座位号
    const seatStyle = new TextStyle({ fontFamily: 'Arial', fontSize: 10, fill: 0x888888 });
    const seatText = new Text({ text: `#${data.seatIndex + 1}`, style: seatStyle });
    seatText.anchor.set(0.5, 1);
    seatText.y = -35;
    c.addChild(seatText);

    // HP 条
    const hpBar = new Graphics();
    c.addChild(hpBar);

    return {
      actorId: data.actorId,
      name: data.name,
      seatIndex: data.seatIndex,
      maxHP: data.maxHP,
      hp: data.maxHP,
      container: c,
      hpBar,
      nameText,
      seatText,
      eliminated: false,
    };
  }

  private layoutActors(): void {
    const count = this.actors.size;
    if (count === 0) return;

    // 横向排列，中心对齐
    const spacing = Math.min(100, (this.width - 40) / count);
    const totalWidth = (count - 1) * spacing;
    const startX = (this.width - totalWidth) / 2;

    let i = 0;
    this.actors.forEach((slot) => {
      slot.container.x = startX + i * spacing;
      slot.container.y = this.height / 2;
      this.updateHpBar(slot);
      i++;
    });
  }

  private updateHpBar(slot: ActorSlot): void {
    slot.hpBar.clear();
    const barWidth = 50;
    const barHeight = 6;
    const ratio = Math.max(0, slot.hp / slot.maxHP);

    slot.hpBar.rect(-barWidth / 2, -45, barWidth, barHeight);
    slot.hpBar.fill({ color: 0x333333 });
    slot.hpBar.rect(-barWidth / 2, -45, barWidth * ratio, barHeight);
    slot.hpBar.fill({ color: ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444 });
  }

  playMove(actorId: string, style: 'minor' | 'attack' | 'hit' | 'eliminated'): void {
    const slot = this.actors.get(actorId);
    if (!slot) return;

    switch (style) {
      case 'minor':
        // 轻微晃动
        this.tween(slot.container, 'x', slot.container.x, slot.container.x + 3, 100, () => {
          this.tween(slot.container, 'x', slot.container.x, slot.container.x - 3, 100);
        });
        break;
      case 'attack':
        // 向前冲
        this.tween(slot.container, 'x', slot.container.x, slot.container.x + 15, 80, () => {
          this.tween(slot.container, 'x', slot.container.x, slot.container.x - 15, 80);
        });
        break;
      case 'hit':
        // 受伤抖动
        this.tween(slot.container, 'x', slot.container.x, slot.container.x - 5, 50, () => {
          this.tween(slot.container, 'x', slot.container.x, slot.container.x + 5, 50, () => {
            this.tween(slot.container, 'x', slot.container.x, slot.container.x - 3, 50, () => {
              this.tween(slot.container, 'x', slot.container.x, slot.container.x + 3, 50);
            });
          });
        });
        break;
      case 'eliminated':
        // 灰掉下沉
        slot.container.alpha = 0.3;
        this.tween(slot.container, 'y', slot.container.y, slot.container.y + 20, 500);
        slot.eliminated = true;
        break;
    }
  }

  showPromptSignal(actorId: string, source: 'PERMANENT' | 'EPISODE'): void {
    const slot = this.actors.get(actorId);
    if (!slot) return;

    const color = source === 'PERMANENT' ? 0xffd700 : 0x00ffff;
    const signal = new Graphics();
    signal.circle(0, 0, 35);
    signal.fill({ color, alpha: 0.3 });
    signal.stroke({ color, width: 2 });
    slot.container.addChild(signal);

    // 脉冲动画
    let scale = 1;
    const pulse = () => {
      scale += 0.05;
      signal.scale.set(1 + Math.sin(scale) * 0.2);
      if (slot.container.children.includes(signal)) {
        setTimeout(pulse, 100);
      }
    };
    pulse();

    // 2秒后移除
    setTimeout(() => {
      if (slot.container.children.includes(signal)) {
        slot.container.removeChild(signal);
        signal.destroy();
      }
    }, 2000);
  }

  private tween(
    obj: any,
    prop: string,
    from: number,
    to: number,
    duration: number,
    onComplete?: () => void
  ): void {
    const start = performance.now();
    const update = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      obj[prop] = from + (to - from) * eased;
      if (t < 1) {
        requestAnimationFrame(update);
      } else {
        onComplete?.();
      }
    };
    requestAnimationFrame(update);
  }

  destroy(): void {
    this.actors.forEach((slot) => slot.container.destroy({ children: true }));
    this.actors.clear();
    this.container.destroy({ children: true });
  }
}
