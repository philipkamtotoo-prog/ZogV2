// BattlePhase
export type BattlePhase =
  | 'PREPARING'
  | 'RUNNING'
  | 'RESOLVING_COMMAND'
  | 'FINAL_REPORT';

// RunMode / ClockState
export type RunMode = 'AUTO' | 'MANUAL';
export type ClockState = 'PLAYING' | 'PAUSED';

// ActorSceneState
export interface ActorSceneState {
  dodosControlled: number;
  dodoTrust: number;
  nestInfluence: number;
}

// SceneState
export interface SceneState {
  totalDodos: number;
  wildDodos: number;
}

// ActorStatus
export type ActorStatus =
  | 'TAUNT_1_ACTION'
  | 'STOMACHACHE_NO_ATTACK'
  | 'SHIELD_ONCE'
  | 'FOCUSED';

// ActorBattleStats
export interface ActorBattleStats {
  damageDealt: number;
  damageTaken: number;
  actionsTaken: number;
  dodosGained: number;
  dodosLost: number;
  directorBroadcastReactedCount: number;
}

// ActorCombatState
export interface ActorCombatState {
  actorId: string;
  name: string;

  maxHP: number;
  currentHP: number;

  ATK: number;
  DEF: number;
  SPD: number;

  baseThreat: number;
  currentThreat: number;

  isAlive: boolean;
  eliminatedAtActionIndex?: number;

  statuses: ActorStatus[];

  initiative: number;
  spotlightDebt: number;
  lastActedActionIndex?: number;
  lastTargetedActionIndex?: number;
  lastHealedAtActorActionIndex?: number;
  tauntedByActorId?: string;

  scene: ActorSceneState;
  stats: ActorBattleStats;
}

// DramaBeat - 未完成，需要业务设计补充
export interface DramaBeat {
  beatId: string;
  type: string;
  focusActorId?: string;
  text: string;
}

// DirectorBroadcast
export interface DirectorBroadcast {
  broadcastId: string;
  text: string;
  scope: 'GLOBAL' | 'TARGETED';
  targetActorIds: string[];
  lifetime: 'NEXT_ACTION' | 'CURRENT_BEAT';
  expiresAtActionIndex: number;
  reactedActorIds: string[];
  sourceTransactionId: string;
}

// CommandTransactionStatus
export type CommandTransactionStatus =
  | 'QUEUED'
  | 'JUDGING'
  | 'WAITING_CLARIFICATION'
  | 'READY_TO_INJECT'
  | 'INJECTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'SYSTEM_FAILED_REFUND';

// CommandGateResult
export type CommandGateDecision = 'ALLOW' | 'ASK' | 'DOWNGRADE' | 'REJECT';

export interface DirectorBroadcastDraft {
  text: string;
  scope: 'GLOBAL' | 'TARGETED';
  targetActorIds: string[];
  lifetime: 'NEXT_ACTION' | 'CURRENT_BEAT';
}

export interface CommandGateResult {
  decision: CommandGateDecision;
  normalizedInput: string;
  reason: string;
  directorBroadcastDraft?: DirectorBroadcastDraft;
}

// CommandTransaction
export interface CommandTransaction {
  transactionId: string;
  rawInput: string;
  normalizedInput: string;
  status: CommandTransactionStatus;
  createdAtActionIndex: number;
  estimatedCost: number;
  frozenCost: number;
  result?: CommandGateResult;
  directorBroadcast?: DirectorBroadcast;
  rejectReason?: string;
}

// ActionType
export type ActionType =
  | 'MOCK_ANIMAL_MANAGEMENT'
  | 'STEAL_DODOS'
  | 'BRIBE_DODOS_WITH_FOOD'
  | 'BUILD_FAKE_NEST'
  | 'FRAME_TARGET_AS_DODO_ENEMY'
  | 'SCARE_HERD'
  | 'TRIGGER_STAMPEDE'
  | 'CALM_HERD'
  | 'CLAIM_NEST_AREA'
  | 'FALLBACK_SIGNAL_STUMBLE';

// TargetPolicy
export type TargetPolicy =
  | 'TARGET_REQUIRED'
  | 'SELF_ONLY'
  | 'GLOBAL'
  | 'OPTIONAL_TARGET';

// ActionTag
export type ActionTag =
  | 'DAMAGE'
  | 'DODO_GAIN'
  | 'DODO_STEAL'
  | 'TRUST_GAIN'
  | 'TRUST_LOSS'
  | 'NEST_GAIN'
  | 'NEST_STEAL'
  | 'THREAT_UP'
  | 'SAFE_FALLBACK';

// ActionDef
export interface ActionDef {
  actionType: ActionType;
  targetPolicy: TargetPolicy;
  damageEnabled: boolean;
  actionPower: number;
  tags: ActionTag[];
}

// ActorBrainOutput
export interface ActorBrainOutput {
  actorId: string;
  targetEcho?: string | null;
  actionType: ActionType;
  line: string;
  actionDescription: string;
  performanceIntent: string;
}

// BattleDiff
export interface BattleDiff {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

// StatusDiff
export interface StatusDiff {
  actorId: string;
  status: ActorStatus;
  added: boolean;
}

// ActorDiff
export interface ActorDiff {
  actorId: string;
  diffs: BattleDiff[];
}

// SceneDiff
export interface SceneDiff {
  totalDodos?: number;
  wildDodos?: number;
}

// BattleEventType
export type BattleEventType =
  | 'ACTION_TAKEN'
  | 'DAMAGE_DEALT'
  | 'DODOS_STOLEN'
  | 'DODOS_BRIBED'
  | 'NEST_CLAIMED'
  | 'STATUS_APPLIED'
  | 'STATUS_REMOVED'
  | 'ACTOR_ELIMINATED'
  | 'DIRECTOR_BROADCAST_INJECTED'
  | 'ITEM_USED'
  | 'ROUND_END';

// BattleEventTag
export type BattleEventTag =
  | 'DAMAGE'
  | 'DODO'
  | 'NEST'
  | 'STATUS'
  | 'ELIMINATION'
  | 'BROADCAST'
  | 'ITEM';

// BattleEvent
export interface BattleEvent {
  eventId: string;
  actorActionIndex: number;
  type: BattleEventType;
  activeActorId?: string;
  targetActorId?: string;
  actionType?: ActionType;
  line?: string;
  actionDescription?: string;
  directorBroadcastId?: string;
  diffs: BattleDiff[];
  tags: BattleEventTag[];
  createdAt: number;
}

// DisplayItem - 战斗表现项
export type DisplayItemType =
  | 'LINE'
  | 'ACTION'
  | 'STATUS_CHANGE'
  | 'BROADCAST'
  | 'SCENE_UPDATE'
  | 'HP_CHANGE'
  | 'ELIMINATION'
  | 'ROUND_END';

export interface DisplayItem {
  itemId: string;
  actorActionIndex: number;
  type: DisplayItemType;
  actorId?: string;
  targetId?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// PlayerSupportState
export interface PlayerSupportState {
  supportedActorId: string;
  betAmount: number;
  odds: number;
  locked: boolean;
}

// BattleState
export interface BattleState {
  battleId: string;
  battleSeed: string;
  phase: BattlePhase;
  runMode: RunMode;
  clockState: ClockState;
  stateVersion: number;
  actorActionIndex: number;

  actors: ActorCombatState[];
  scene: SceneState;

  currentBeat?: DramaBeat;
  directorBroadcasts: DirectorBroadcast[];
  commandTransactions: CommandTransaction[];

  eventLog: BattleEvent[];
  displayQueue: DisplayItem[];

  playerSupport?: PlayerSupportState;
  itemUsesRemaining: number;
  usedItemIds: string[];
}

// CommitInput
export interface CommitInput {
  battleId: string;
  stateVersion: number;
  actorActionIndex: number;
  activeActorId: string;
  lockedTargetId?: string | null;
  actionType: ActionType;
  actorBrainOutput: ActorBrainOutput;
}

// CommitResult
export interface CommitResult {
  newStateVersion: number;
  events: BattleEvent[];
  actorDiffs: ActorDiff[];
  sceneDiff: SceneDiff;
  statusDiffs: StatusDiff[];
  eliminatedActorIds: string[];
  shouldCheckEnd: boolean;
  newActors?: ActorCombatState[];
}

// ValidationFailure
export interface ValidationFailure {
  reason: string;
  field?: string;
}

// ValidatedActorBrainOutput
export type ValidatedActorBrainOutput =
  | { valid: true; output: ActorBrainOutput }
  | { valid: false; failure: ValidationFailure };

// ActorBrainProvider
export interface ActorBrainProvider {
  generate(
    battleState: BattleState,
    activeActorId: string,
    allowedActionTypes: ActionType[],
    lockedTargetId: string | null,
    directorBroadcasts: DirectorBroadcast[]
  ): Promise<ActorBrainOutput>;
}

// CommandGateProvider
export interface CommandGateProvider {
  evaluate(rawInput: string, battleState: BattleState): Promise<CommandGateResult>;
}
