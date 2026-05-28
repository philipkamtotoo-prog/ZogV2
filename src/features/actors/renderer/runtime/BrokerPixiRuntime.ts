import { Application } from 'pixi.js';
import { BrokerActorPortraitScene } from './BrokerActorPortraitScene';

export class BrokerPixiRuntime {
  private app: Application | null = null;
  private scene: BrokerActorPortraitScene | null = null;
  private mounted = false;
  private destroyRequested = false;

  async mount(container: HTMLElement, actorId: string | null | undefined): Promise<void> {
    if (this.mounted || this.app) return;

    this.destroyRequested = false;
    const app = new Application();
    this.app = app;
    const bounds = getContainerBounds(container);

    await app.init({
      width: bounds.width,
      height: bounds.height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      preference: 'webgl',
    });

    if (this.destroyRequested) {
      this.destroyPixiApp(app);
      if (this.app === app) this.app = null;
      return;
    }

    container.appendChild(app.canvas);
    this.mounted = true;
    this.scene = new BrokerActorPortraitScene(app.stage, bounds.width, bounds.height);
    await this.scene.showActor(actorId);
  }

  resize(width: number, height: number): void {
    if (this.app && this.mounted) {
      this.app.renderer.resize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    }

    this.scene?.resize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  }

  showActor(actorId: string | null | undefined): void {
    this.scene?.showActor(actorId).catch((error) => {
      console.error('[BrokerPixiRuntime] Actor portrait load failed:', error);
    });
  }

  playRandomInteractiveAction(actorId: string | null | undefined): void {
    this.scene?.playRandomInteractiveAction(actorId).catch((error) => {
      console.error('[BrokerPixiRuntime] Actor portrait action failed:', error);
    });
  }

  destroy(): void {
    this.destroyRequested = true;
    this.scene?.destroy();
    this.scene = null;

    if (!this.app || !this.mounted) return;

    this.destroyPixiApp(this.app);
    this.app = null;
  }

  private destroyPixiApp(app: Application): void {
    try {
      app.destroy(true, { children: true, texture: false });
    } catch (error) {
      console.warn('[BrokerPixiRuntime] Pixi destroy skipped after partial init:', error);
    } finally {
      this.mounted = false;
    }
  }
}

function getContainerBounds(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  return {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}
