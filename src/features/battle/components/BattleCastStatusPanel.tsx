import type { ActorCombatState } from '../../../core/battle/types';

export function BattleCastStatusPanel({ actors }: { actors: ActorCombatState[] }) {
  return (
    <section className="battle-cast-panel">
      {actors.map((actor) => {
        const hpPercent = Math.max(0, Math.round((actor.currentHP / actor.maxHP) * 100));
        return (
          <div className="battle-cast-row" key={actor.actorId}>
            <div className="battle-cast-avatar">{actor.name.slice(0, 1)}</div>
            <div className="battle-cast-info">
              <strong>{actor.name}</strong>
              <span>ATK:{actor.ATK} DEF:{actor.DEF} SPD:{actor.SPD}</span>
            </div>
            <div className="battle-cast-hp">
              <span>HP: {actor.currentHP}/{actor.maxHP}</span>
              <div><i style={{ width: `${hpPercent}%` }} /></div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
