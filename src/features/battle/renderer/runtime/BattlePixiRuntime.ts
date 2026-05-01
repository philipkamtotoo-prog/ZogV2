import { Application } from 'pixi.js';
import { BattleScene } from './BattleScene';

export class BattlePixiRuntime {
  private app: Application | null = null;
  private scene: BattleScene | null = null;
  private mounted = false;
  private mountPromise: Promise<void> | null = null;
  private destroyRequested = false;

  async mount(container: HTMLElement, width: number, height: number): Promise<void> {
    if (this.mounted) return;
    if (this.mountPromise) return this.mountPromise;

    this.destroyRequested = false;
    const app = new Application();
    this.app = app;

    this.mountPromise = (async () => {
      await app.init({
        width,
        height,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (this.destroyRequested) {
        this.destroyPixiApp(app);
        if (this.app === app) this.app = null;
        return;
      }

      container.appendChild(app.canvas);
      this.mounted = true;
      this.scene = new BattleScene(app.stage);
    })();

    try {
      await this.mountPromise;
    } finally {
      if (this.mountPromise) {
        this.mountPromise = null;
      }
    }
  }

  destroy(): void {
    this.destroyRequested = true;

    if (this.scene) {
      this.scene.destroy();
      this.scene = null;
    }

    if (!this.app) {
      this.mounted = false;
      return;
    }

    // React StrictMode can unmount before Pixi Application.init has finished.
    // In that case, let mount() finish and clean up the fully initialized app.
    if (!this.mounted) {
      return;
    }

    this.destroyPixiApp(this.app);
    this.app = null;
    this.mounted = false;
  }

  resize(width: number, height: number): void {
    if (this.app && this.mounted) {
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

  private destroyPixiApp(app: Application): void {
    try {
      app.destroy(true, { children: true, texture: true });
    } catch (error) {
      console.warn('[BattlePixiRuntime] Pixi destroy skipped after partial init:', error);
    } finally {
      this.mounted = false;
    }
  }
}
