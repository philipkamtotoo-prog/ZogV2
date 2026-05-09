import { useEffect, useRef } from 'react';
import { Application, Assets, Sprite } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

const LAMP_PATH = `/brokeroffice/${encodeURIComponent('\u706f\u6ce1.png')}`;

export function LampGlow() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    let disposed = false;
    let app: Application | null = null;
    let glowFilter: GlowFilter | null = null;
    let animationFrame: number | null = null;
    let startTime = 0;

    const mount = async () => {
      app = new Application();

      await app.init({
        width: 168,
        height: 168,
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

      const texture = await Assets.load(LAMP_PATH);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = 122;
      sprite.height = 114;
      sprite.x = 84;
      sprite.y = 84;

      glowFilter = new GlowFilter({
        color: 0xfff0bd,
        outerStrength: 2.8,
        innerStrength: 1.2,
        distance: 36,
        quality: 0.25,
      });

      sprite.filters = [glowFilter];
      app.stage.addChild(sprite);

      startTime = performance.now();

      const animate = () => {
        if (disposed || !glowFilter) {
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;
        const flicker1 = Math.sin(elapsed * 8) * 0.3;
        const flicker2 = Math.sin(elapsed * 13.7) * 0.2;
        const flicker3 = Math.sin(elapsed * 23.1) * 0.15;
        const noise = (Math.random() - 0.5) * 0.3;
        const strength = 2.7 + flicker1 + flicker2 + flicker3 + noise;

        glowFilter.outerStrength = Math.max(1.8, Math.min(4.8, strength));
        glowFilter.innerStrength = Math.max(0.8, Math.min(2.2, strength * 0.72));

        animationFrame = requestAnimationFrame(animate);
      };

      animate();
    };

    mount().catch((error) => {
      console.error('[LampGlow] Mount failed:', error);
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
          // ignore
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 1338,
        top: -30,
        width: 178,
        height: 178,
        pointerEvents: 'none',
      }}
    />
  );
}
