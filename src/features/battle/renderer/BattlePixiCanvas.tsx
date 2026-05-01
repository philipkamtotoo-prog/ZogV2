/**
 * BattlePixiCanvas - React host for the Pixi battle stage.
 *
 * Pixi Application.init is async. Bootstrap must happen after mount resolves,
 * otherwise getScene() can still be null on the first battle render.
 */

import { useEffect, useRef } from 'react';
import { BattlePixiRuntime } from './runtime/BattlePixiRuntime';
import { DisplayEventPlayer } from './runtime/DisplayEventPlayer';
import { createBattleRenderBootstrap } from './battleRenderBootstrap';
import type { BattleState } from '../../../core/battle/types';
import type { DisplayEvent } from '../display/displayTypes';

interface Props {
  battleState: BattleState | null;
  displayLog: DisplayEvent[];
  engineId: string | null;
  width?: number;
  height?: number;
}

export function BattlePixiCanvas({
  battleState,
  displayLog,
  engineId,
  width = 800,
  height = 600,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<BattlePixiRuntime | null>(null);
  const playerRef = useRef<DisplayEventPlayer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const latestBattleStateRef = useRef<BattleState | null>(battleState);
  const latestEngineIdRef = useRef<string | null>(engineId);

  latestBattleStateRef.current = battleState;
  latestEngineIdRef.current = engineId;

  const bootstrapLatestBattle = () => {
    const runtime = runtimeRef.current;
    const player = playerRef.current;
    const latestBattleState = latestBattleStateRef.current;
    const latestEngineId = latestEngineIdRef.current;
    const scene = runtime?.getScene();

    if (!runtime || !player || !scene || !latestBattleState || !latestEngineId) {
      return;
    }

    scene.bootstrap(createBattleRenderBootstrap(latestBattleState, latestEngineId));
    player.bindBattle(latestEngineId);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const runtime = new BattlePixiRuntime();
    const player = new DisplayEventPlayer();
    let disposed = false;

    runtimeRef.current = runtime;
    playerRef.current = player;

    runtime
      .mount(containerRef.current, width, height)
      .then(() => {
        if (disposed) return;
        bootstrapLatestBattle();
        console.info('[BattlePixiCanvas] Pixi runtime mounted');
      })
      .catch((err) => {
        console.error('[BattlePixiCanvas] Pixi mount failed, falling back to React-only:', err);
      });

    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        runtime.resize(rect.width || width, rect.height || height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      runtime.destroy();
      runtimeRef.current = null;
      playerRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    bootstrapLatestBattle();
  }, [battleState?.battleId, battleState?.selectedMutation?.mutationId, engineId]);

  useEffect(() => {
    const player = playerRef.current;
    const runtime = runtimeRef.current;
    const scene = runtime?.getScene();
    if (!player || !runtime || !scene) return;

    const processEvents = () => {
      const ops = player.consumeNewEvents(displayLog);
      if (ops.length > 0) {
        scene.executeOps(ops);
      }
      animationFrameRef.current = requestAnimationFrame(processEvents);
    };

    animationFrameRef.current = requestAnimationFrame(processEvents);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [displayLog, engineId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 300,
        backgroundColor: '#1a1a2e',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    />
  );
}
