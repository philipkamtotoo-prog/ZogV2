import type { ActorCombatState, SceneState } from '../../../core/battle/types';

interface DodoScoreboardProps {
  actors: ActorCombatState[];
  scene: SceneState;
}

export function DodoScoreboard({ actors, scene }: DodoScoreboardProps) {
  const alive = actors.filter((a) => a.isAlive);
  const sorted = [...alive].sort((a, b) => b.scene.dodosControlled - a.scene.dodosControlled);

  return (
    <div style={{ padding: 8, background: '#16213e', borderRadius: 8, minWidth: 200 }}>
      <div style={{ fontWeight: 'bold', color: '#88ccff', marginBottom: 8, fontSize: 14 }}>
        Dodo Scoreboard
      </div>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
        Total: {scene.totalDodos} | Wild: {scene.wildDodos}
      </div>
      {sorted.map((actor) => (
        <div
          key={actor.actorId}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '2px 0',
            fontSize: 12,
            color: '#ccc',
          }}
        >
          <span>{actor.name}</span>
          <span style={{ color: '#88ccff', fontWeight: 'bold' }}>{actor.scene.dodosControlled}</span>
        </div>
      ))}
    </div>
  );
}
