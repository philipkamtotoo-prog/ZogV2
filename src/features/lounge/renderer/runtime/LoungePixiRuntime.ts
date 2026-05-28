import { Application } from 'pixi.js';
import { LoungeScene } from './LoungeScene';

export class LoungePixiRuntime {
  private app: Application | null = null;
  private scene: LoungeScene | null = null;
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
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preference: 'webgl',
      });

      if (this.destroyRequested) {
        this.destroyPixiApp(app);
        if (this.app === app) this.app = null;
        return;
      }

      container.appendChild(app.canvas);
      this.mounted = true;
      this.scene = new LoungeScene(app.stage, width, height);

      try {
        await this.scene.initialize();
      } catch (error) {
        this.scene.destroy();
        this.scene = null;
        this.destroyPixiApp(app);
        if (this.app === app) this.app = null;
        throw error;
      }

      if (this.destroyRequested) {
        this.scene.destroy();
        this.scene = null;
        this.destroyPixiApp(app);
        if (this.app === app) this.app = null;
      }
    })();

    try {
      await this.mountPromise;
    } finally {
      this.mountPromise = null;
    }
  }

  resize(width: number, height: number): void {
    if (this.app && this.mounted) {
      this.app.renderer.resize(width, height);
    }
    this.scene?.resize(width, height);
  }

  setShopHover(hovered: boolean): void {
    this.scene?.setShopHover(hovered);
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

    if (!this.mounted) {
      return;
    }

    this.destroyPixiApp(this.app);
    this.app = null;
    this.mounted = false;
  }

  private destroyPixiApp(app: Application): void {
    try {
      app.destroy(true, { children: true, texture: false });
    } catch (error) {
      console.warn('[LoungePixiRuntime] Pixi destroy skipped after partial init:', error);
    } finally {
      this.mounted = false;
    }
  }
}
