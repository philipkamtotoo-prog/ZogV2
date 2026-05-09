/**
 * Display queue drain utilities.
 * Encapsulates the while-loop pattern for consuming display items from the engine.
 */

import type { DisplayEvent } from '../display/displayTypes';
type BattleEngine = ReturnType<typeof import('../../../engine/battleEngine').createBattleEngine>;

/**
 * Synchronously drain all items from the engine's display queue.
 * Appends each item using the provided append function.
 */
export function drainDisplayQueue(
  engine: BattleEngine,
  append: (item: DisplayEvent) => void
): void {
  let item = engine.consumeDisplayItem() as DisplayEvent | null;
  while (item) {
    append(item);
    item = engine.consumeDisplayItem() as DisplayEvent | null;
  }
}

/**
 * Start a recurring drain loop at the specified interval.
 * Automatically stops when the battle enters FINAL_REPORT phase.
 *
 * @param engine - The battle engine
 * @param intervalMs - Drain interval in milliseconds
 * @param append - Function to append a display item to state
 * @param onFinalReport - Called when FINAL_REPORT is detected (immediate drain trigger)
 * @returns A function to stop the loop
 */
export function startDisplayDrainLoop(
  engine: BattleEngine,
  intervalMs: number,
  append: (item: DisplayEvent) => void,
  onFinalReport: () => void
): () => void {
  const drain = () => drainDisplayQueue(engine, append);

  const interval = setInterval(() => {
    drain();
    const state = engine.getState();
    if (state && state.battleState.phase === 'FINAL_REPORT') {
      clearInterval(interval);
      drain();
      onFinalReport();
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
