import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

export function BrokerPixiCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const app = new Application();
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;
    let mounted = false;

    const mount = async () => {
      const rect = container.getBoundingClientRect();

      await app.init({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (disposed) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      mounted = true;
      container.appendChild(app.canvas);

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        const { width, height } = entry.contentRect;
        app.renderer.resize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
      });

      resizeObserver.observe(container);
    };

    mount().catch((error) => {
      console.error('[BrokerPixiCanvas] Pixi mount failed:', error);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();

      if (!mounted) {
        return;
      }

      try {
        app.destroy(true, { children: true, texture: true });
      } catch (error) {
        console.warn('[BrokerPixiCanvas] Pixi destroy skipped after partial init:', error);
      }
    };
  }, []);

  return <div className="broker-pixi-canvas" ref={containerRef} />;
}
