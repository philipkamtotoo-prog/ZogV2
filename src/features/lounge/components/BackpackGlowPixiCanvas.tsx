import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { assetPath as gameAssetPath } from '../../../shared/game-ui';

type BackpackTab = 'battle' | 'snacks';

interface BackpackGlowPixiCanvasProps {
  activeTab: BackpackTab;
  width: number;
  height: number;
}

const GLOW_ASSETS = {
  battle: gameAssetPath('backpackOverlay', '发光按钮荒.png'),
  snacks: gameAssetPath('backpackOverlay', '发光按钮紫.png'),
} as const;

const TAB_GLOW_BOXES: Record<BackpackTab, { x: number; y: number; width: number; height: number }> = {
  battle: { x: 238, y: 123, width: 168, height: 63 },
  snacks: { x: 407, y: 122, width: 179, height: 64 },
};

const DECOR_DOTS = [
  { x: 386, y: -1, color: 0xf249c9, delay: 0 },
  { x: 420, y: -13, color: 0xff4eb6, delay: 0.7 },
  { x: 454, y: -1, color: 0xa887ff, delay: 1.35 },
] as const;

export function BackpackGlowPixiCanvas({ activeTab, width, height }: BackpackGlowPixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let disposed = false;
    let app: Application | null = null;
    let animationFrame: number | null = null;
    let battleGlow: Sprite | null = null;
    let snackGlow: Sprite | null = null;
    let glowFilter: GlowFilter | null = null;
    const dotFilters: GlowFilter[] = [];
    const dotGraphics: Graphics[] = [];
    let startTime = performance.now();

    const mount = async () => {
      app = new Application();
      await app.init({
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (disposed) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      container.appendChild(app.canvas);

      const [battleTexture, snackTexture] = await Promise.all([
        Assets.load(GLOW_ASSETS.battle),
        Assets.load(GLOW_ASSETS.snacks),
      ]);

      if (disposed || !app) return;

      const glowLayer = new Container();
      app.stage.addChild(glowLayer);

      battleGlow = new Sprite(battleTexture);
      snackGlow = new Sprite(snackTexture);

      for (const tab of ['battle', 'snacks'] as const) {
        const sprite = tab === 'battle' ? battleGlow : snackGlow;
        const box = TAB_GLOW_BOXES[tab];
        sprite.x = box.x;
        sprite.y = box.y;
        sprite.width = box.width;
        sprite.height = box.height;
        sprite.alpha = tab === activeTabRef.current ? 1 : 0;
        glowLayer.addChild(sprite);
      }

      glowFilter = new GlowFilter({
        color: activeTabRef.current === 'battle' ? 0xffd15b : 0xbb71ff,
        outerStrength: 2.2,
        innerStrength: 0.9,
        distance: 28,
        quality: 0.25,
      });
      battleGlow.filters = [glowFilter];
      snackGlow.filters = [glowFilter];

      for (const dot of DECOR_DOTS) {
        const graphic = new Graphics();
        graphic.circle(0, 0, 5);
        graphic.fill({ color: dot.color, alpha: 0.08 });
        graphic.x = dot.x;
        graphic.y = dot.y;

        const filter = new GlowFilter({
          color: dot.color,
          outerStrength: 2.4,
          innerStrength: 1.2,
          distance: 28,
          quality: 0.25,
        });
        graphic.filters = [filter];
        dotFilters.push(filter);
        dotGraphics.push(graphic);
        app.stage.addChild(graphic);
      }

      startTime = performance.now();

      const animate = () => {
        if (disposed || !battleGlow || !snackGlow || !glowFilter) return;

        const elapsed = (performance.now() - startTime) / 1000;
        const pulse = 0.5 + Math.sin(elapsed * 3.1) * 0.5;
        battleGlow.alpha = activeTabRef.current === 'battle' ? 0.72 + pulse * 0.28 : 0;
        snackGlow.alpha = activeTabRef.current === 'snacks' ? 0.72 + pulse * 0.28 : 0;
        glowFilter.color = activeTabRef.current === 'battle' ? 0xffd15b : 0xbb71ff;
        glowFilter.outerStrength = 2.2 + pulse * 1.4;
        glowFilter.innerStrength = 0.9 + pulse * 0.5;

        dotFilters.forEach((filter, index) => {
          const dotPulse = 0.5 + Math.sin(elapsed * 4.4 + DECOR_DOTS[index].delay) * 0.5;
          filter.outerStrength = 1.8 + dotPulse * 2.7;
          filter.innerStrength = 0.8 + dotPulse * 1.1;
          dotGraphics[index].alpha = 0.62 + dotPulse * 0.38;
        });

        animationFrame = requestAnimationFrame(animate);
      };

      animate();
    };

    mount().catch((error) => {
      console.error('[BackpackGlowPixiCanvas] Pixi mount failed:', error);
    });

    return () => {
      disposed = true;
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
      if (app) {
        try {
          app.destroy(true, { children: true, texture: true });
        } catch {
          // ignore Pixi teardown edge cases during hot reload
        }
      }
    };
  }, [height, width]);

  return <div aria-hidden="true" className="backpack-pixi-glow" ref={containerRef} />;
}
