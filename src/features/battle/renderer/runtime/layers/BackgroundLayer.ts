/**
 * BackgroundLayer - 背景层
 * 显示 arena 占位背景和渡渡鸟数量
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class BackgroundLayer {
  readonly container: Container;
  private arena: Graphics;
  private dodoCountText: Text;

  constructor() {
    this.container = new Container();

    this.arena = new Graphics();
    this.container.addChild(this.arena);

    const textStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xaaaaaa,
    });
    this.dodoCountText = new Text({ text: '渡渡鸟: 0', style: textStyle });
    this.dodoCountText.x = 10;
    this.dodoCountText.y = 10;
    this.container.addChild(this.dodoCountText);
  }

  setTotalDodos(count: number): void {
    this.dodoCountText.text = `渡渡鸟: ${count}`;
  }

  resize(width: number, height: number): void {
    this.arena.clear();
    // Arena 占位框
    this.arena.rect(-4, -4, width + 8, height + 8);
    this.arena.fill({ color: 0x2a2a4e, alpha: 0.3 });
    this.arena.stroke({ color: 0x4a4a7e, width: 2 });

    // 中心分隔线
    this.arena.moveTo(width / 2, 0);
    this.arena.lineTo(width / 2, height);
    this.arena.stroke({ color: 0x3a3a6e, width: 1, alpha: 0.5 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
