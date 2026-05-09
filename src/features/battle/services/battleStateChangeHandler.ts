import type { BattleState, BattleEvent } from '../../../core/battle/types';
import { calculateFinalScores, calculateSalaryAwards } from '../../../core/battle/finalScore';
import { generateZogReaction } from '../../reports/zogReaction';
import { generateFallbackLiveReport } from '../../reports/reportGenerator';
import { useLoungeStore } from '../../lounge/loungeStore';
import type { LiveReporterProvider } from '../../../llm/liveReporterProvider';
import type { LiveReport } from '../../reports/reportGenerator';
import type { FinalScore } from '../../../core/battle/finalScore';

export interface HandlerDeps {
  engineRef: { current: ReturnType<typeof import('../../../engine/battleEngine').createBattleEngine> | null };
  capturedId: string;
  liveReporterProvider: LiveReporterProvider;
}

function buildMemoryLogs(state: BattleState, previousActionIndex: number): string[] {
  return state.reporterMemory
    .filter((memory) => memory.actorActionIndex > previousActionIndex)
    .sort((a, b) => b.severity - a.severity || b.actorActionIndex - a.actorActionIndex)
    .map((memory) => `[#${memory.actorActionIndex}] ${memory.title}: ${memory.text}`);
}

function buildEventLogs(state: BattleState): string[] {
  return state.eventLog
    .slice(-20)
    .filter(
      (event: BattleEvent) =>
        Boolean(event.line) ||
        event.type === 'ACTOR_ELIMINATED' ||
        event.type === 'DIRECTOR_BROADCAST_INJECTED'
    )
    .map((event: BattleEvent) => {
      if (event.type === 'ACTOR_ELIMINATED') {
        const targetName = state.actors.find((actor) => actor.actorId === event.targetActorId)?.name ?? 'Unknown';
        return `[#${event.actorActionIndex}] 致命击杀：${targetName} 阵亡`;
      }

      if (event.type === 'DIRECTOR_BROADCAST_INJECTED') {
        return `[#${event.actorActionIndex}] 导播信号：${event.broadcastText ?? event.diffs[0]?.newValue ?? '节目组正在施压'}`;
      }

      const actorName = state.actors.find((actor) => actor.actorId === event.activeActorId)?.name ?? 'Unknown';
      return `[#${event.actorActionIndex}] ${actorName}: ${event.line}`;
    });
}

export function createBattleStateChangeHandler(
  getState: () => { engineId: string | null; lastLiveReportActionIndex: number; finalizePendingCommands: () => void },
  setState: (partial: {
    battleState?: BattleState;
    finalScores?: FinalScore[];
    liveReport?: LiveReport | null;
    lastLiveReportActionIndex?: number;
    view?: string;
  }) => void,
  deps: HandlerDeps
): { onStateChange: (state: BattleState) => void } {
  let finalized = false;

  const onStateChange = (state: BattleState) => {
    const { engineRef, capturedId, liveReporterProvider } = deps;

    if (getState().engineId !== capturedId) return;
    setState({ battleState: { ...state } });

    if (state.phase === 'FINAL_REPORT') {
      if (finalized) return;
      finalized = true;

      getState().finalizePendingCommands();
      const scores = calculateFinalScores(state.actors, state.eventLog);
      const salaryAwards = calculateSalaryAwards(scores);
      state.salaryAwards = salaryAwards;
      for (const award of salaryAwards) {
        useLoungeStore.getState().addActorSalary(award.actorId, award.totalSalary);
      }

      const reaction = generateZogReaction(scores);
      engineRef.current?.recordFactEvent({
        eventId: `evt_${Date.now()}_zog`,
        actorActionIndex: state.actorActionIndex,
        type: 'ZOG_REACTION_EMITTED',
        activeActorId: undefined,
        diffs: [],
        tags: ['ZOG'],
        createdAt: Date.now(),
        zogReaction: reaction,
      });

      setState({ finalScores: scores, view: 'RESULTS' });
      return;
    }

    if (state.phase !== 'RUNNING') return;

    const previousActionIndex = getState().lastLiveReportActionIndex;
    if (state.actorActionIndex - previousActionIndex < 3) return;

    setState({ lastLiveReportActionIndex: state.actorActionIndex });
    const memoryLogs = buildMemoryLogs(state, previousActionIndex);
    const eventLogs = buildEventLogs(state);
    const recentLogs = memoryLogs.length > 0 ? memoryLogs : eventLogs;

    liveReporterProvider
      .generateLiveReport(state, recentLogs)
      .then((report) => {
        if (report && getState().engineId === capturedId) {
          setState({ liveReport: report });
        }
      })
      .catch(() => {
        const fallback = generateFallbackLiveReport(state, recentLogs);
        if (fallback) {
          setState({ liveReport: fallback });
        }
      });
  };

  return { onStateChange };
}
