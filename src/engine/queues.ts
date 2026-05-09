/**
 * Queue management.
 * The engine owns orchestration queues but does not know any feature-layer
 * presentation payload types.
 */

export interface Queues {
  generationQueue: GenerationQueueItem[];
  commitQueue: CommitQueueItem[];
  displayQueue: unknown[];
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

export function createQueues(): Queues {
  return {
    generationQueue: [],
    commitQueue: [],
    displayQueue: [],
  };
}

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

export function dequeueGeneration(queues: Queues, actorId: string): Queues {
  return {
    ...queues,
    generationQueue: queues.generationQueue.filter((item) => item.actorId !== actorId),
  };
}

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

export function dequeueCommit(queues: Queues, actorId: string): Queues {
  return {
    ...queues,
    commitQueue: queues.commitQueue.filter((item) => item.actorId !== actorId),
  };
}

export function enqueueDisplay(queues: Queues, item: unknown): Queues {
  return {
    ...queues,
    displayQueue: [...queues.displayQueue, item],
  };
}

export function dequeueDisplay(queues: Queues): { item: unknown | null; queues: Queues } {
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

export function peekDisplay(queues: Queues): unknown | null {
  return queues.displayQueue[0] ?? null;
}

export function clearGenerationQueue(queues: Queues): Queues {
  return {
    ...queues,
    generationQueue: [],
  };
}

export function isGenerationQueueEmpty(queues: Queues): boolean {
  return queues.generationQueue.length === 0;
}

export function isCommitQueueEmpty(queues: Queues): boolean {
  return queues.commitQueue.length === 0;
}
