import { useEffect, useRef } from 'react';
import { BrokerPixiRuntime } from '../renderer/runtime/BrokerPixiRuntime';

interface BrokerPixiCanvasProps {
  actorId: string | null | undefined;
  actionRequestId: number;
}

export function BrokerPixiCanvas({ actorId, actionRequestId }: BrokerPixiCanvasProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const runtimeRef = useRef<BrokerPixiRuntime | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const runtime = new BrokerPixiRuntime();
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;
    runtimeRef.current = runtime;

    const mount = async () => {
      await runtime.mount(container, actorId);

      if (disposed) {
        return;
      }

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        const { width, height } = entry.contentRect;
        runtime.resize(width, height);
      });

      resizeObserver.observe(container);
    };

    mount().catch((error) => {
      console.error('[BrokerPixiCanvas] Pixi mount failed:', error);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.showActor(actorId);
  }, [actorId]);

  useEffect(() => {
    if (actionRequestId <= 0) return;
    runtimeRef.current?.playRandomInteractiveAction(actorId);
  }, [actorId, actionRequestId]);

  return (
    <button
      aria-label="播放演员动作"
      className="broker-pixi-canvas"
      ref={containerRef}
      type="button"
    />
  );
}
