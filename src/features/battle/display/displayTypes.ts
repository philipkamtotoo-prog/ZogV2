/**
 * DisplayEvent - 表现层 discriminated union
 * 所有 React/Pixi UI 只依赖这个合同
 */

export type DisplayEventKind =
  | 'ACTOR_LINE'   // 角色台词
  | 'ACTOR_ACTION'  // 一般行动描述
  | 'DAMAGE'        // 造成伤害
  | 'HEAL'          // 回血/治疗
  | 'STATUS'        // 状态增减
  | 'ELIMINATION'   // 淘汰
  | 'ITEM'          // 道具使用
  | 'BROADCAST'     // 导演广播
  | 'REPORTER'      // 记者/ReporterMemory 摘要
  | 'ZOG'           // Zog 反应
  | 'MUTATION'      // 变异液效果
  | 'PROMPT';       // Prompt 注入

export type DisplayEvent =
  | { kind: 'ACTOR_LINE';     eventId: string; actorActionIndex: number; actorId: string; content: string; metadata?: Record<string, unknown> }
  | { kind: 'ACTOR_ACTION';   eventId: string; actorActionIndex: number; actorId: string; content: string; metadata?: Record<string, unknown> }
  | { kind: 'DAMAGE';         eventId: string; actorActionIndex: number; targetId: string; damage: number; oldHp: number; newHp: number; content: string }
  | { kind: 'HEAL';            eventId: string; actorActionIndex: number; targetId: string; healAmount: number; oldHp: number; newHp: number; content: string }
  | { kind: 'STATUS';          eventId: string; actorActionIndex: number; targetId: string; status: string; added: boolean; content: string }
  | { kind: 'ELIMINATION';     eventId: string; actorActionIndex: number; targetId: string; content: string }
  | { kind: 'ITEM';            eventId: string; actorActionIndex: number; actorId: string; targetId: string; itemId: string; itemName: string; content: string }
  | { kind: 'BROADCAST';      eventId: string; actorActionIndex: number; content: string; metadata?: { broadcastId?: string } }
  | { kind: 'REPORTER';        eventId: string; actorActionIndex: number; content: string; memoryType: string; severity: number }
  | { kind: 'ZOG';             eventId: string; actorActionIndex: number; content: string }
  | { kind: 'MUTATION';       eventId: string; actorActionIndex: number; mutationId: string; mutationName: string; content: string }
  | { kind: 'PROMPT';          eventId: string; actorActionIndex: number; actorId: string; content: string; source: 'PERMANENT' | 'EPISODE' };
