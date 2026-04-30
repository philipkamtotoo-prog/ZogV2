/**
 * DisplayEventPlayer - DisplayEvent 增量播放控制器
 *
 * 规则（正式冻结）：
 * - 只维护本地 lastConsumedIndex，不回写 store
 * - 只读取 [lastConsumedIndex, displayLog.length) 增量
 * - 不修改 displayLog，不做 dequeue/splice/truncate
 * - lastConsumedIndex 和 battleId 绑定，重置时机：
 *   - 新 battle
 *   - reroll 后新 engine
 *   - 返回客厅再开一局
 * - 不重置时机：暂停/恢复/AUTO-MANUAL 切换
 */

import type { DisplayEvent } from '../../display/displayTypes';
import type { RenderOp } from '../battleRenderBootstrap';
import { displayEventToRenderOp } from '../battleRenderBootstrap';

export class DisplayEventPlayer {
  private lastConsumedIndex = 0;
  private battleId: string | null = null;

  /**
   * 和新的 battleId 绑定时重置游标
   */
  bindBattle(battleId: string): void {
    if (this.battleId !== battleId) {
      this.battleId = battleId;
      this.lastConsumedIndex = 0;
    }
  }

  /**
   * 消费 displayLog 的增量，返回 RenderOp 数组
   */
  consumeNewEvents(displayLog: DisplayEvent[]): RenderOp[] {
    const ops: RenderOp[] = [];

    // 安全检查：如果 displayLog 变短了（理论上不应该），重置游标
    if (this.lastConsumedIndex > displayLog.length) {
      this.lastConsumedIndex = 0;
    }

    for (let i = this.lastConsumedIndex; i < displayLog.length; i++) {
      const event = displayLog[i];
      const eventOps = displayEventToRenderOp(event);
      ops.push(...eventOps);
    }

    this.lastConsumedIndex = displayLog.length;
    return ops;
  }

  getLastConsumedIndex(): number {
    return this.lastConsumedIndex;
  }

  reset(): void {
    this.lastConsumedIndex = 0;
    this.battleId = null;
  }
}
