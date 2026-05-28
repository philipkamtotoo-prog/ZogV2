import { useEffect, useRef } from 'react';
import { LoungePixiRuntime } from './runtime/LoungePixiRuntime';

interface LoungePixiCanvasProps {
  width: number;
  height: number;
  shopHovered: boolean;
}

export function LoungePixiCanvas({
  width,
  height,
  shopHovered,
}: LoungePixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<LoungePixiRuntime | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const runtime = new LoungePixiRuntime();
    let disposed = false;
    runtimeRef.current = runtime;

    const mount = async () => {
      await runtime.mount(containerRef.current!, width, height);
      if (disposed) return;
      runtime.setShopHover(shopHovered);
    };

    mount().catch((error) => {
      console.error('[LoungePixiCanvas] Pixi mount failed:', error);
    });

    return () => {
      disposed = true;
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [height, width]);

  useEffect(() => {
    runtimeRef.current?.resize(width, height);
  }, [height, width]);

  useEffect(() => {
    runtimeRef.current?.setShopHover(shopHovered);
  }, [shopHovered]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        zIndex: 9,
        pointerEvents: 'none',
        filter: shopHovered
          ? 'drop-shadow(0 0 5px rgba(184, 255, 106, 0.95)) drop-shadow(0 0 13px rgba(184, 255, 106, 0.78)) drop-shadow(0 0 26px rgba(184, 255, 106, 0.46))'
          : 'drop-shadow(0 0 4px rgba(184, 255, 106, 0.68)) drop-shadow(0 0 11px rgba(184, 255, 106, 0.42))',
        transition: 'filter 160ms ease',
      }}
    />
  );
}
