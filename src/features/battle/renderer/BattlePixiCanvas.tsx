/**
 * BattlePixiCanvas - React Host for Pixi battle stage
 *
 * 职责：
 * - 在 useEffect 中管理 Pixi runtime 生命周期（mount/destroy/resize）
 * - 消费 displayLog 增量，调用 DisplayEventPlayer
 * - 保留 React 控制区和调试区不动
 * - Fallback：如果 Pixi 初始化失败，页面仍然能继续用 React 版本跑战斗
 */

import { useEffect, useRef } from 'react';
import { BattlePixiRuntime } from './runtime/BattlePixiRuntime';
import { DisplayEventPlayer } from './runtime/DisplayEventPlayer';
import { createBattleRenderBootstrap } from './battleRenderBootstrap';
import type { DisplayEvent } from '../display/displayTypes';
import type { BattleRenderBootstrap } from './battleRenderBootstrap';

interface Props {
  battleState: import('../../../core/battle/types').BattleState | null;
  displayLog: DisplayEvent[];
  engineId: string | null;
  width?: number;
  height?: number;
}

export function BattlePixiCanvas({ battleState, displayLog, engineId, width = 800, height = 600 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<BattlePixiRuntime | null>(null);
  const playerRef = useRef<DisplayEventPlayer | null>(null);
  const bootstrapRef = useRef<BattleRenderBootstrap | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 初始化 runtime
  useEffect(() => {
    if (!containerRef.current) return;

    const runtime = new BattlePixiRuntime();
    runtimeRef.current = runtime;

    const player = new DisplayEventPlayer();
    playerRef.current = player;

    runtime
      .mount(containerRef.current, width, height)
      .then(() => {
        console.info('[BattlePixiCanvas] Pixi runtime mounted');
      })
      .catch((err) => {
        console.error('[BattlePixiCanvas] Pixi mount failed, falling back to React-only:', err);
      });

    // 处理 resize
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        runtime.resize(rect.width || width, rect.height || height);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      runtime.destroy();
      runtimeRef.current = null;
      playerRef.current = null;
    };
  }, [width, height]);

  // bootstrap 当新 battle 开始时
  useEffect(() => {
    if (!battleState || !engineId || !runtimeRef.current) return;

    const bootstrap = createBattleRenderBootstrap(battleState, engineId);
    bootstrapRef.current = bootstrap;

    const scene = runtimeRef.current.getScene();
    if (scene) {
      scene.bootstrap(bootstrap);
    }

    // 绑定 player 到新 battle
    playerRef.current?.bindBattle(engineId);
  }, [battleState, engineId]);

  // 消费 displayLog 增量，驱动渲染循环
  useEffect(() => {
    const player = playerRef.current;
    const runtime = runtimeRef.current;
    if (!player || !runtime) return;

    const scene = runtime.getScene();
    if (!scene) return;

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
