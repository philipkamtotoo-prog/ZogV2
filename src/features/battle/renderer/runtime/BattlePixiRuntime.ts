/**
 * BattlePixiRuntime - Pixi 表现层运行时管理器
 *
 * 职责：
 * - 管理 Pixi Application 生命周期（init/destroy）
 * - 维护 BattleScene 实例
 * - 处理 resize
 * - 对外暴露 mount 到指定 DOM 容器
 */

import { Application } from 'pixi.js';
import { BattleScene } from './BattleScene';

export class BattlePixiRuntime {
  private app: Application | null = null;
  private scene: BattleScene | null = null;
  private mounted = false;

  async mount(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.mounted) return;

    this.app = new Application();

    await this.app.init({
      width,
      height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    this.mounted = true;

    this.scene = new BattleScene(this.app.stage);
  }

  destroy(): void {
    if (this.scene) {
      this.scene.destroy();
      this.scene = null;
    }
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
    this.mounted = false;
  }

  resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
    }
    if (this.scene) {
      this.scene.resize(width, height);
    }
  }

  getScene(): BattleScene | null {
    return this.scene;
  }

  isMounted(): boolean {
    return this.mounted;
  }
}
