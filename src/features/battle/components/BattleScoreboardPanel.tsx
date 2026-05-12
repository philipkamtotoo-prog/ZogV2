import { calculateFinalScores } from '../../../core/battle/finalScore';
import type { ActorCombatState, BattleEvent } from '../../../core/battle/types';

export function BattleScoreboardPanel({ actors, eventLog }: { actors: ActorCombatState[]; eventLog: BattleEvent[] }) {
  const scores = calculateFinalScores(actors, eventLog);
  const actorById = new Map(actors.map((actor) => [actor.actorId, actor]));

  return (
    <section className="battle-scoreboard-panel" aria-label="Scoreboard">
      <header className="battle-score-header">
        <span>RANK</span>
        <span>CAST</span>
        <span>DODO</span>
        <span>SCORE</span>
      </header>
      <div>
        {scores.map((score) => (
          <div className="battle-score-row" key={score.actorId}>
            <em>#{score.rank}</em>
            <span>{score.name}</span>
            <strong>{actorById.get(score.actorId)?.scene.dodosControlled ?? 0}</strong>
            <strong>{score.finalScore}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
