/**
 * EffectLayer - 特效层
 * 显示飘字（伤害/治疗）、气泡、状态图标、道具动画
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class EffectLayer {
  readonly container: Container;
  private width = 800;
  private height = 480;

  constructor() {
    this.container = new Container();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  showSpeechBubble(_actorId: string, text: string): void {
    // 占位：创建一个简单的文字气泡
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: 120,
    });
    const bubble = new Graphics();
    bubble.roundRect(-60, -20, 120, 40, 8);
    bubble.fill({ color: 0x3a3a6e, alpha: 0.9 });
    bubble.stroke({ color: 0x6a6aae, width: 1 });

    const label = new Text({ text, style });
    label.anchor.set(0.5);

    const c = new Container();
    c.addChild(bubble);
    c.addChild(label);
    c.x = this.width / 2;
    c.y = 30;
    this.container.addChild(c);

    // 1.5秒后消失
    setTimeout(() => {
      this.container.removeChild(c);
      c.destroy({ children: true });
    }, 1500);
  }

  showDamage(targetId: string, amount: number): void {
    this.showFloatingNumber(targetId, `-${amount}`, 0xcc4444);
  }

  showHeal(targetId: string, amount: number): void {
    this.showFloatingNumber(targetId, `+${amount}`, 0x44cc44);
  }

  private showFloatingNumber(_targetId: string, text: string, color: number): void {
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: color,
    });
    const label = new Text({ text, style });
    label.anchor.set(0.5);

    const c = new Container();
    c.addChild(label);
    c.x = this.width / 2;
    c.y = this.height / 2;
    this.container.addChild(c);

    // 向上飘动并消失
    let alpha = 1;
    const animate = () => {
      c.y -= 1;
      alpha -= 0.02;
      c.alpha = Math.max(0, alpha);
      if (alpha > 0) {
        requestAnimationFrame(animate);
      } else {
        this.container.removeChild(c);
        c.destroy({ children: true });
      }
    };
    requestAnimationFrame(animate);
  }

  showStatusBadge(_targetId: string, status: string, added: boolean): void {
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: added ? 0x44cc44 : 0xcc4444,
    });
    const label = new Text({ text: status, style });
    label.anchor.set(0.5);

    const badge = new Graphics();
    badge.roundRect(-25, -10, 50, 20, 4);
    badge.fill({ color: 0x222244, alpha: 0.9 });
    badge.stroke({ color: added ? 0x44cc44 : 0xcc4444, width: 1 });

    const c = new Container();
    c.addChild(badge);
    c.addChild(label);
    c.x = this.width / 2;
    c.y = this.height / 2 - 50;
    this.container.addChild(c);

    // 飘入效果
    c.alpha = 0;
    c.y += 10;
    const fadeIn = () => {
      c.alpha += 0.1;
      c.y -= 1;
      if (c.alpha < 1) {
        requestAnimationFrame(fadeIn);
      } else {
        // 2秒后消失
        setTimeout(() => {
          const fadeOut = () => {
            c.alpha -= 0.1;
            if (c.alpha > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              this.container.removeChild(c);
              c.destroy({ children: true });
            }
          };
          requestAnimationFrame(fadeOut);
        }, 2000);
      }
    };
    requestAnimationFrame(fadeIn);
  }

  showItemCast(_targetId: string, itemId: string, source: 'PLAYER' | 'ACTOR', _actorId?: string): void {
    // 占位道具图标
    const icon = new Graphics();
    icon.roundRect(-12, -12, 24, 24, 4);
    icon.fill({ color: 0xffd700 });
    icon.stroke({ color: 0xffff00, width: 1 });

    const style = new TextStyle({ fontFamily: 'Arial', fontSize: 8, fill: 0x000000 });
    const label = new Text({ text: itemId.slice(0, 3), style });
    label.anchor.set(0.5);
    icon.addChild(label);

    const c = new Container();
    c.addChild(icon);

    // 起点：source === 'PLAYER' 从屏幕边缘，否则从 actorId
    const startX = source === 'PLAYER' ? -20 : this.width / 2;
    const startY = source === 'PLAYER' ? this.height : this.height / 2;
    c.x = startX;
    c.y = startY;
    this.container.addChild(c);

    // 飞向目标
    const targetX = this.width / 2;
    const targetY = this.height / 2;
    const duration = 400;
    const start = performance.now();

    const fly = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      c.x = startX + (targetX - startX) * eased;
      c.y = startY + (targetY - startY) * eased;
      c.scale.set(1 - t * 0.5);
      if (t < 1) {
        requestAnimationFrame(fly);
      } else {
        this.container.removeChild(c);
        c.destroy({ children: true });
      }
    };
    requestAnimationFrame(fly);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
