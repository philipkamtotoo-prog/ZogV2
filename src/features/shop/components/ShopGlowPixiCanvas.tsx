import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Sprite } from 'pixi.js';

type ShopGlowAssetMap = {
  glow1: string;
  glow2: string;
  glow3: string;
  glow4: string;
  glow5: string;
  glow6: string;
  glow7: string;
};

interface ShopGlowPixiCanvasProps {
  assets: ShopGlowAssetMap;
  width: number;
  height: number;
}

const GLOW_LAYERS = [
  { key: 'glow1', x: 28, y: 895, width: 42, height: 107 },
  { key: 'glow2', x: 1368, y: 586, width: 34, height: 136 },
  { key: 'glow3', x: 1371, y: 440, width: 22, height: 23 },
  { key: 'glow4', x: 1371, y: 475, width: 21, height: 24 },
  { key: 'glow5', x: 1168, y: 61, width: 30, height: 12 },
  { key: 'glow6', x: 11, y: 644, width: 33, height: 55 },
  { key: 'glow7', x: 1128, y: 177, width: 80, height: 116, outerOnly: true },
] as const;

export function ShopGlowPixiCanvas({ assets, height, width }: ShopGlowPixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let app: Application | null = null;
    let disposed = false;
    let animationFrame: number | null = null;
    const glowSprites: Sprite[] = [];
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
        preference: 'webgl',
      });

      if (disposed || !app) {
        app?.destroy(true, { children: true, texture: false });
        return;
      }

      container.appendChild(app.canvas);
      const layer = new Container();
      app.stage.addChild(layer);

      const textures = await Promise.all(
        GLOW_LAYERS.map((item) => Assets.load(assets[item.key]))
      );
      if (disposed || !app) return;

      GLOW_LAYERS.forEach((item, index) => {
        const outerOnly = 'outerOnly' in item && item.outerOnly;
        const sprite = new Sprite(textures[index]);
        sprite.x = item.x;
        sprite.y = item.y;
        sprite.width = item.width;
        sprite.height = item.height;
        sprite.alpha = outerOnly ? 0.98 : 0.86;
        sprite.blendMode = 'add'; // Use additive blending instead of GlowFilter for performance and stability
        
        glowSprites.push(sprite);
        layer.addChild(sprite);
      });

      startTime = performance.now();

      const animate = () => {
        if (disposed) return;
        const elapsed = (performance.now() - startTime) / 1000;
        glowSprites.forEach((sprite, index) => {
          const item = GLOW_LAYERS[index];
          const outerOnly = 'outerOnly' in item && item.outerOnly;
          const pulse = (Math.sin(elapsed * 4.4 + index * 0.72) + 1) / 2;
          sprite.alpha = outerOnly ? 0.8 + pulse * 0.2 : 0.58 + pulse * 0.42;
        });
        animationFrame = requestAnimationFrame(animate);
      };

      animate();
    };

    mount().catch((error) => {
      console.error('[ShopGlowPixiCanvas] Pixi mount failed:', error);
    });

    return () => {
      disposed = true;
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
      if (app) {
        try {
          app.destroy(true, { children: true, texture: false });
        } catch {
          // Ignore Pixi teardown edge cases during hot reload / StrictMode.
        }
      }
    };
  }, [assets, height, width]);

  return <div aria-hidden="true" className="shop-pixi-glow" ref={containerRef} />;
}
