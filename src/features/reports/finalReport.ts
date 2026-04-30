import type { BattleEvent, BattleState, SalaryAward, StageBrief, ReporterMemoryEntry } from '../../core/battle/types';
import type { EpisodeBill } from './bill';
import type { FinalScore } from '../../core/battle/finalScore';
import { calculateFinalScores, calculateSalaryAwards } from '../../core/battle/finalScore';
import { generateZogReaction } from './zogReaction';

export interface BattleReport {
  reportId: string;
  battleId: string;
  createdAt: number;
  title: string;
  summary: string;
  winner: { actorId: string; name: string; score: number } | null;
  mvp: { actorId: string; name: string; score: number } | null;
  rankings: FinalScore[];
  highlightDialogue: string;
  biggestIncident: string;
  playerCommands: { input: string; status: string }[];
  zogReaction: string;
  totalActions: number;
  totalEvents: number;
  eliminationOrder: { actorId: string; name: string; atAction: number }[];
  stageBriefs: StageBrief[];
  shameRecords: { actorId: string; name: string; reason: string; atAction: number }[];
  accidentSummary: string;
  salaryAwards: SalaryAward[];
  mutationName?: string;
  promptInjections: { actorId: string; actorName: string; prompt: string }[];
  bill?: EpisodeBill;
  reporterMemory?: ReporterMemoryEntry[];
}

export function extractBattleReport(
  battleState: BattleState,
  bill?: EpisodeBill,
  reporterMemory?: ReporterMemoryEntry[]
): BattleReport {
  const scores = calculateFinalScores(battleState.actors, battleState.eventLog);
  const winnerScore = scores.find((s) => s.isWinner);
  const mvpScore = scores.find((s) => s.isMVP);
  const salaryAwards = battleState.salaryAwards.length > 0
    ? battleState.salaryAwards
    : calculateSalaryAwards(scores);
  const highlights = extractHighlights(battleState.eventLog, battleState);

  return {
    reportId: `report_${battleState.battleId}`,
    battleId: battleState.battleId,
    createdAt: Date.now(),
    title: generateQuickTitle(battleState, winnerScore),
    summary: generateQuickSummary(battleState, scores),
    winner: winnerScore
      ? { actorId: winnerScore.actorId, name: winnerScore.name, score: winnerScore.finalScore }
      : null,
    mvp: mvpScore
      ? { actorId: mvpScore.actorId, name: mvpScore.name, score: mvpScore.breakdown.totalDamageDealt }
      : null,
    rankings: scores,
    highlightDialogue: highlights.bestLine,
    biggestIncident: highlights.biggestIncident,
    playerCommands: battleState.commandTransactions.map((t) => ({
      input: t.rawInput,
      status: t.status,
    })),
    zogReaction: generateZogReaction(scores),
    totalActions: battleState.actorActionIndex,
    totalEvents: battleState.eventLog.length,
    eliminationOrder: extractEliminations(battleState),
    stageBriefs: battleState.stageBriefs.length > 0 ? battleState.stageBriefs : generateStageBriefs(battleState),
    shameRecords: generateShameRecords(battleState),
    accidentSummary: highlights.biggestIncident,
    salaryAwards,
    mutationName: battleState.selectedMutation?.name,
    promptInjections: battleState.actorPromptInjections.map((injection) => ({
      actorId: injection.actorId,
      actorName: battleState.actors.find((a) => a.actorId === injection.actorId)?.name ?? injection.actorId,
      prompt: injection.prompt,
    })),
    bill,
    reporterMemory,
  };
}

function extractEliminations(state: BattleState) {
  return state.eventLog
    .filter((e) => e.type === 'ACTOR_ELIMINATED')
    .map((e) => {
      const actor = state.actors.find((a) => a.actorId === e.targetActorId);
      return {
        actorId: e.targetActorId ?? '',
        name: actor?.name ?? 'Unknown',
        atAction: e.actorActionIndex,
      };
    });
}

function generateQuickTitle(state: BattleState, winner: FinalScore | undefined): string {
  if (winner) return `${winner.name} wins the Dodo Riot`;
  if (state.actors.every((a) => a.isAlive)) return 'Peaceful Dodo Accounting Disaster';
  return 'Island Dodo Riot Report';
}

function generateQuickSummary(state: BattleState, scores: FinalScore[]): string {
  const alive = state.actors.filter((a) => a.isAlive).length;
  const winner = scores.find((s) => s.isWinner);
  const mutation = state.selectedMutation ? ` Mutation: ${state.selectedMutation.name}.` : '';
  return `After ${state.actorActionIndex} actor actions, ${alive} actors survived. ${winner ? `${winner.name} ranked first with ${winner.finalScore}.` : ''}${mutation}`;
}

interface Highlights {
  bestLine: string;
  biggestIncident: string;
}

function extractHighlights(eventLog: BattleEvent[], state: BattleState): Highlights {
  const lines = eventLog.filter((e) => e.line).map((e) => e.line!);
  const bestLine = lines.length > 0 ? lines[Math.floor(lines.length / 2)] : '(no standout line)';

  const elimination = eventLog.find((e) => e.type === 'ACTOR_ELIMINATED');
  if (elimination) {
    const victim = state.actors.find((a) => a.actorId === elimination.targetActorId);
    return {
      bestLine,
      biggestIncident: `${victim?.name ?? 'Unknown'} was eliminated at action ${elimination.actorActionIndex}.`,
    };
  }

  const item = eventLog.find((e) => e.type === 'ITEM_USED');
  if (item) {
    const target = state.actors.find((a) => a.actorId === item.targetActorId);
    return {
      bestLine,
      biggestIncident: `Player emergency item used on ${target?.name ?? item.targetActorId}.`,
    };
  }

  return { bestLine, biggestIncident: 'No major accident, which is suspicious for this channel.' };
}

function generateStageBriefs(state: BattleState): StageBrief[] {
  const briefs: StageBrief[] = [];
  for (let start = 0; start < state.actorActionIndex; start += 10) {
    const end = Math.min(start + 9, state.actorActionIndex);
    const events = state.eventLog.filter((e) => e.actorActionIndex >= start && e.actorActionIndex <= end);
    const damageEvents = events.filter((e) => e.tags.includes('DAMAGE')).length;
    const dodoEvents = events.filter((e) => e.tags.includes('DODO')).length;
    const eliminations = events.filter((e) => e.type === 'ACTOR_ELIMINATED').length;
    briefs.push({
      briefId: `brief_${state.battleId}_${start}`,
      actorActionIndex: end,
      text: `Actions ${start}-${end}: ${damageEvents} damage beats, ${dodoEvents} dodo moves, ${eliminations} eliminations.`,
    });
  }
  return briefs;
}

function generateShameRecords(state: BattleState) {
  const records = state.actors
    .filter((actor) => !actor.isAlive || actor.scene.dodoTrust <= 3 || actor.scene.dodosControlled === 0)
    .map((actor) => ({
      actorId: actor.actorId,
      name: actor.name,
      reason: !actor.isAlive
        ? 'eliminated on broadcast'
        : actor.scene.dodoTrust <= 3
          ? 'lost dodo trust'
          : 'controlled zero dodos at settlement',
      atAction: actor.eliminatedAtActionIndex ?? state.actorActionIndex,
    }));

  const shameEvents = state.eventLog.filter((e) => e.tags.includes('SHAME'));
  for (const e of shameEvents) {
    if (e.targetActorId) {
      const actor = state.actors.find((a) => a.actorId === e.targetActorId);
      if (actor) {
        records.push({
          actorId: actor.actorId,
          name: actor.name,
          reason: e.actionType === 'MOCK_ANIMAL_MANAGEMENT' ? 'mocked on television' : 'framed as enemy',
          atAction: e.actorActionIndex,
        });
      }
    }
  }

  return records;
}
