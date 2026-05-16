import type { ActorCombatState } from '../../../core/battle/types';

interface BattleCastStatusPanelProps {
  actors: ActorCombatState[];
  selectedItemName?: string | null;
  onUseItem?: (actorId: string) => void;
}

export function BattleCastStatusPanel({ actors, selectedItemName, onUseItem }: BattleCastStatusPanelProps) {
  return (
    <section className="battle-cast-panel">
      {actors.map((actor) => {
        const hpPercent = Math.max(0, Math.round((actor.currentHP / actor.maxHP) * 100));
        const canUseItem = Boolean(selectedItemName && actor.isAlive && onUseItem);
        return (
          <button
            className={`battle-cast-row${canUseItem ? ' is-item-target' : ''}`}
            disabled={!canUseItem}
            key={actor.actorId}
            onClick={() => canUseItem && onUseItem?.(actor.actorId)}
            title={canUseItem ? `对 ${actor.name} 使用 ${selectedItemName}` : undefined}
            type="button"
          >
            <div className="battle-cast-avatar">{actor.name.slice(0, 1)}</div>
            <div className="battle-cast-info">
              <strong>{actor.name}</strong>
              <span>ATK:{actor.ATK} DEF:{actor.DEF} SPD:{actor.SPD}</span>
            </div>
            <div className="battle-cast-hp">
              <span>HP: {actor.currentHP}/{actor.maxHP}</span>
              <div><i style={{ width: `${hpPercent}%` }} /></div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
