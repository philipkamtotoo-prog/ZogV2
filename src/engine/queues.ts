/**
 * 队列管理
 * 管理 generationQueue、commitQueue、displayQueue
 */

import type { DisplayEvent } from '../features/battle/display/displayTypes';

/**
 * Queues - 管理战斗中的各种队列
 */
export interface Queues {
  // 生成队列（等待 LLM 生成）
  generationQueue: GenerationQueueItem[];

  // 提交队列（等待状态更新）
  commitQueue: CommitQueueItem[];

  // 显示队列（等待 UI 播放）
  displayQueue: DisplayEvent[];
}

export interface GenerationQueueItem {
  actorId: string;
  stateVersion: number;
  createdAt: number;
}

export interface CommitQueueItem {
  actorId: string;
  stateVersion: number;
  actorActionIndex: number;
  createdAt: number;
}

/**
 * 创建空队列
 */
export function createQueues(): Queues {
  return {
    generationQueue: [],
    commitQueue: [],
    displayQueue: [],
  };
}

/**
 * 添加到生成队列
 */
export function enqueueGeneration(
  queues: Queues,
  actorId: string,
  stateVersion: number
): Queues {
  return {
    ...queues,
    generationQueue: [
      ...queues.generationQueue,
      { actorId, stateVersion, createdAt: Date.now() },
    ],
  };
}

/**
 * 从生成队列移除
 */
export function dequeueGeneration(queues: Queues, actorId: string): Queues {
  return {
    ...queues,
    generationQueue: queues.generationQueue.filter((item) => item.actorId !== actorId),
  };
}

/**
 * 添加到提交队列
 */
export function enqueueCommit(
  queues: Queues,
  actorId: string,
  stateVersion: number,
  actorActionIndex: number
): Queues {
  return {
    ...queues,
    commitQueue: [
      ...queues.commitQueue,
      { actorId, stateVersion, actorActionIndex, createdAt: Date.now() },
    ],
  };
}

/**
 * 从提交队列移除
 */
export function dequeueCommit(queues: Queues, actorId: string): Queues {
  return {
    ...queues,
    commitQueue: queues.commitQueue.filter((item) => item.actorId !== actorId),
  };
}

/**
 * 添加到显示队列
 */
export function enqueueDisplay(queues: Queues, item: DisplayEvent): Queues {
  return {
    ...queues,
    displayQueue: [...queues.displayQueue, item],
  };
}

/**
 * 取出下一个显示项
 */
export function dequeueDisplay(queues: Queues): { item: DisplayEvent | null; queues: Queues } {
  if (queues.displayQueue.length === 0) {
    return { item: null, queues };
  }

  const [item, ...rest] = queues.displayQueue;
  return {
    item,
    queues: {
      ...queues,
      displayQueue: rest,
    },
  };
}

/**
 * 查看下一个显示项（不移除）
 */
export function peekDisplay(queues: Queues): DisplayEvent | null {
  return queues.displayQueue[0] ?? null;
}

/**
 * 清空生成队列（用于取消）
 */
export function clearGenerationQueue(queues: Queues): Queues {
  return {
    ...queues,
    generationQueue: [],
  };
}

/**
 * 检查队列是否为空
 */
export function isGenerationQueueEmpty(queues: Queues): boolean {
  return queues.generationQueue.length === 0;
}

export function isCommitQueueEmpty(queues: Queues): boolean {
  return queues.commitQueue.length === 0;
}
