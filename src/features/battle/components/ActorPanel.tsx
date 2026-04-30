import type { ActorCombatState } from '../../../core/battle/types';

interface ActorPanelProps {
  actor: ActorCombatState;
  isActive?: boolean;
}

export function ActorPanel({ actor, isActive }: ActorPanelProps) {
  const hpPercent = Math.max(0, Math.floor((actor.currentHP / actor.maxHP) * 100));

  const hpColor = hpPercent > 60 ? '#4caf50' : hpPercent > 30 ? '#ff9800' : '#f44336';

  return (
    <div
      style={{
        border: isActive ? '2px solid #ffeb3b' : '1px solid #555',
        borderRadius: 8,
        padding: 12,
        margin: 4,
        background: actor.isAlive ? '#1a1a2e' : '#2a1a1a',
        opacity: actor.isAlive ? 1 : 0.5,
        minWidth: 140,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#eee' }}>
        {actor.name}
        {isActive && <span style={{ color: '#ffeb3b', marginLeft: 4 }}>★</span>}
      </div>

      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
        ATK:{actor.ATK} DEF:{actor.DEF} SPD:{actor.SPD}
      </div>

      <div style={{ background: '#333', borderRadius: 4, height: 12, overflow: 'hidden', marginBottom: 4 }}>
        <div
          style={{
            width: `${hpPercent}%`,
            height: '100%',
            background: hpColor,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: '#ccc' }}>
        HP: {actor.currentHP}/{actor.maxHP}
      </div>

      <div style={{ fontSize: 11, color: '#88ccff', marginTop: 4 }}>
        Dodos: {actor.scene.dodosControlled}
      </div>

      {actor.statuses.length > 0 && (
        <div style={{ fontSize: 10, color: '#ffa726', marginTop: 2 }}>
          {actor.statuses.join(', ')}
        </div>
      )}

      {!actor.isAlive && (
        <div style={{ fontSize: 11, color: '#f44336', marginTop: 2 }}>ELIMINATED</div>
      )}
    </div>
  );
}
