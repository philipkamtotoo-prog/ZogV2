/**
 * OverlayLayer - 覆盖层
 * 显示导演广播、记者快讯、变异效果、Zog 反应
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class OverlayLayer {
  readonly container: Container;
  private width = 800;
  private height = 600;

  constructor() {
    this.container = new Container();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  showBroadcast(text: string): void {
    const c = new Container();

    const bg = new Graphics();
    bg.roundRect(-200, -25, 400, 50, 8);
    bg.fill({ color: 0x2a1a4a, alpha: 0.95 });
    bg.stroke({ color: 0x9a30ff, width: 2 });
    c.addChild(bg);

    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: 380,
    });
    const label = new Text({ text, style });
    label.anchor.set(0.5);
    c.addChild(label);

    c.x = this.width / 2;
    c.y = 40;
    c.alpha = 0;
    this.container.addChild(c);

    // 淡入
    const fadeIn = () => {
      c.alpha += 0.1;
      if (c.alpha < 1) {
        requestAnimationFrame(fadeIn);
      } else {
        // 3秒后淡出
        setTimeout(() => {
          const fadeOut = () => {
            c.alpha -= 0.05;
            if (c.alpha > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              this.container.removeChild(c);
              c.destroy({ children: true });
            }
          };
          requestAnimationFrame(fadeOut);
        }, 3000);
      }
    };
    requestAnimationFrame(fadeIn);
  }

  showReporter(text: string, severity: number): void {
    const c = new Container();

    const bg = new Graphics();
    bg.roundRect(-180, -20, 360, 40, 6);
    bg.fill({ color: 0x1a2a1a, alpha: 0.95 });
    bg.stroke({ color: severity > 5 ? 0xff4444 : 0x44ff44, width: 1 });
    c.addChild(bg);

    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xcccccc,
      wordWrap: true,
      wordWrapWidth: 350,
    });
    const label = new Text({ text, style });
    label.anchor.set(0.5, 0.5);
    c.addChild(label);

    c.x = this.width / 2;
    c.y = this.height - 60;
    c.alpha = 0;
    this.container.addChild(c);

    // 淡入
    const fadeIn = () => {
      c.alpha += 0.1;
      if (c.alpha < 1) {
        requestAnimationFrame(fadeIn);
      } else {
        // 4秒后淡出
        setTimeout(() => {
          const fadeOut = () => {
            c.alpha -= 0.05;
            if (c.alpha > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              this.container.removeChild(c);
              c.destroy({ children: true });
            }
          };
          requestAnimationFrame(fadeOut);
        }, 4000);
      }
    };
    requestAnimationFrame(fadeIn);
  }

  showMutation(mutationName: string): void {
    const c = new Container();

    const bg = new Graphics();
    bg.roundRect(-200, -30, 400, 60, 10);
    bg.fill({ color: 0x4a1a4a, alpha: 0.95 });
    bg.stroke({ color: 0xff00ff, width: 3 });
    c.addChild(bg);

    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 18,
      fontWeight: 'bold',
      fill: 0xff66ff,
      wordWrap: true,
      wordWrapWidth: 380,
    });
    const label = new Text({ text: `变异: ${mutationName}`, style });
    label.anchor.set(0.5, 0.5);
    c.addChild(label);

    c.x = this.width / 2;
    c.y = this.height / 2;
    c.alpha = 0;
    c.scale.set(0.5);
    this.container.addChild(c);

    // 全屏闪烁
    const flash = new Graphics();
    flash.rect(0, 0, this.width, this.height);
    flash.fill({ color: 0xff00ff, alpha: 0.3 });
    this.container.addChild(flash);

    const start = performance.now();
    const flashAnim = () => {
      const elapsed = performance.now() - start;
      flash.alpha = Math.sin(elapsed / 100) * 0.3;
      if (elapsed < 1500) {
        requestAnimationFrame(flashAnim);
      } else {
        this.container.removeChild(flash);
        flash.destroy();
      }
    };
    requestAnimationFrame(flashAnim);

    // 缩放淡入
    const zoomIn = () => {
      c.alpha += 0.1;
      c.scale.set(c.scale.x + 0.05);
      if (c.alpha < 1) {
        requestAnimationFrame(zoomIn);
      } else {
        c.scale.set(1);
        // 2秒后消失
        setTimeout(() => {
          const fadeOut = () => {
            c.alpha -= 0.05;
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
    requestAnimationFrame(zoomIn);
  }

  showZog(text: string): void {
    const c = new Container();

    const bg = new Graphics();
    bg.roundRect(-250, -30, 500, 60, 10);
    bg.fill({ color: 0x1a1a1a, alpha: 0.95 });
    bg.stroke({ color: 0xffcc00, width: 2 });
    c.addChild(bg);

    const style = new TextStyle({
      fontFamily: 'Georgia',
      fontSize: 20,
      fontStyle: 'italic',
      fill: 0xffcc00,
      wordWrap: true,
      wordWrapWidth: 480,
    });
    const label = new Text({ text: `"${text}"`, style });
    label.anchor.set(0.5, 0.5);
    c.addChild(label);

    c.x = this.width / 2;
    c.y = this.height - 100;
    c.alpha = 0;
    this.container.addChild(c);

    // 淡入
    const fadeIn = () => {
      c.alpha += 0.05;
      if (c.alpha < 1) {
        requestAnimationFrame(fadeIn);
      } else {
        // 5秒后淡出
        setTimeout(() => {
          const fadeOut = () => {
            c.alpha -= 0.03;
            if (c.alpha > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              this.container.removeChild(c);
              c.destroy({ children: true });
            }
          };
          requestAnimationFrame(fadeOut);
        }, 5000);
      }
    };
    requestAnimationFrame(fadeIn);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
