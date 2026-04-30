/**
 * CommandGate - 上帝指令审查
 * 四态：ALLOW / ASK / DOWNGRADE / REJECT
 */

import type { BattleState, CommandTransaction, CommandGateResult, CommandTransactionStatus } from '../../core/battle/types';

export interface CommandGateConfig {
  // 首次 REJECT 免费
  // 后续 REJECT 扣 30%
  rejectCostRatio: number;

  // ASK 阶段不扣费
  askCostFree: boolean;

  // 超时时间（毫秒）
  timeout: number;
}

export const DEFAULT_COMMAND_GATE_CONFIG: CommandGateConfig = {
  rejectCostRatio: 0.3,
  askCostFree: true,
  timeout: 10000,
};

/**
 * 处理上帝指令
 */
export function processCommand(
  rawInput: string,
  battleState: BattleState,
  config: CommandGateConfig = DEFAULT_COMMAND_GATE_CONFIG,
  transactionId: string = `cmd_${Date.now()}`
): CommandTransaction {
  const transaction: CommandTransaction = {
    transactionId,
    rawInput,
    normalizedInput: normalizeInput(rawInput),
    status: 'QUEUED',
    createdAtActionIndex: battleState.actorActionIndex,
    estimatedCost: calculateCost(rawInput, config),
    frozenCost: 0,
    paidCost: 0,
    refundedCost: 0,
  };

  return transaction;
}

/**
 * 标准化输入
 */
export function normalizeInput(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * 计算指令费用
 * 文档：每个有效计数字消耗 20 G
 */
export function calculateCost(
  input: string,
  _config: CommandGateConfig = DEFAULT_COMMAND_GATE_CONFIG
): number {
  return input.length * 20;
}

/**
 * 判断指令是否涉及死亡宣称
 */
export function containsDeathClaim(input: string): boolean {
  const deathPatterns = [
    /死了|死亡|干掉|消灭|杀了|打死|踢出|出局/,
  ];
  return deathPatterns.some((pattern) => pattern.test(input));
}

/**
 * 判断指令是否涉及强制伤害
 */
export function containsForceDamage(input: string): boolean {
  const forcePatterns = [
    /打死|重创|消灭|击杀|干掉/,
  ];
  return forcePatterns.some((pattern) => pattern.test(input));
}

/**
 * 判断指令是否需要澄清
 */
export function requiresClarification(input: string): boolean {
  // 如果包含"他"等代词但没有明确目标，需要澄清
  const ambiguousPatterns = [
    /^(他|她|它|这个|那个)/,
  ];
  return ambiguousPatterns.some((pattern) => pattern.test(input));
}

/**
 * 估算冻结费用
 */
export function freezeEstimatedCost(transaction: CommandTransaction): CommandTransaction {
  return {
    ...transaction,
    status: 'JUDGING',
    frozenCost: transaction.estimatedCost,
  };
}

/**
 * 应用判定结果
 */
export function applyGateResult(
  transaction: CommandTransaction,
  result: CommandGateResult,
  config: CommandGateConfig = DEFAULT_COMMAND_GATE_CONFIG
): CommandTransaction {
  let newStatus: CommandTransactionStatus;
  let frozenCost = transaction.frozenCost;
  switch (result.decision) {
    case 'ALLOW':
      newStatus = 'READY_TO_INJECT';
      frozenCost = transaction.estimatedCost;
      break;

    case 'ASK':
      newStatus = 'WAITING_CLARIFICATION';
      if (config.askCostFree) {
        frozenCost = 0;
      }
      break;

    case 'DOWNGRADE':
      newStatus = 'READY_TO_INJECT';
      frozenCost = transaction.estimatedCost;
      break;

    case 'REJECT':
      newStatus = 'REJECTED';
      if (transaction.createdAtActionIndex > 0) {
        frozenCost = Math.floor(transaction.estimatedCost * config.rejectCostRatio);
      } else {
        frozenCost = 0;
      }
      break;
  }

  return {
    ...transaction,
    status: newStatus,
    frozenCost,
    result,
    pendingRawInput: result.decision === 'ASK' ? transaction.rawInput : undefined,
    rejectReason: result.decision === 'REJECT' ? result.reason : undefined,
  };
}

/**
 * 检查是否超时需要退款
 */
export function shouldRefund(transaction: CommandTransaction): boolean {
  return (
    transaction.status === 'WAITING_CLARIFICATION' &&
    transaction.directorBroadcast === undefined
  );
}

/**
 * 获取退款金额
 */
export function getRefundAmount(transaction: CommandTransaction): number {
  if (transaction.status === 'WAITING_CLARIFICATION') {
    return transaction.frozenCost;
  }
  if (transaction.status === 'QUEUED' || transaction.status === 'JUDGING') {
    return transaction.estimatedCost;
  }
  return 0;
}
