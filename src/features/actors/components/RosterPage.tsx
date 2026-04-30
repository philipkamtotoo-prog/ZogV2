import { DEFAULT_ROSTER, type RosterActor } from '../actorRoster';
import { useLoungeStore } from '../../lounge/loungeStore';

interface RosterPageProps {
  onBack: () => void;
}

export function RosterPage({ onBack }: RosterPageProps) {
  const { unlockedActorIds, gold, zogAffection, unlockActor } = useLoungeStore();

  const isUnlocked = (a: RosterActor) => a.defaultUnlocked || unlockedActorIds.includes(a.actorId);

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#ffeb3b', margin: 0 }}>演员名册</h2>
        <button onClick={onBack} style={backBtnStyle}>返回</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEFAULT_ROSTER.map((actor) => {
          const unlocked = isUnlocked(actor);
          const canUnlock = !unlocked && gold >= actor.unlockCost && zogAffection >= actor.unlockAffection;

          return (
            <div
              key={actor.actorId}
              style={{
                padding: 12,
                background: unlocked ? '#1a1a2e' : '#1a1a1a',
                borderRadius: 8,
                border: `1px solid ${unlocked ? '#333' : '#222'}`,
                opacity: unlocked ? 1 : 0.7,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ color: '#eee', fontWeight: 'bold' }}>
                  {unlocked ? actor.name : '???'}
                </span>
                <span style={{ color: '#888', fontSize: 11 }}>
                  {unlocked ? actor.title : '未解锁'}
                </span>
              </div>

              {unlocked ? (
                <>
                  <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>{actor.bio}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#aaa' }}>
                    <span>ATK: {actor.baseATK}</span>
                    <span>DEF: {actor.baseDEF}</span>
                    <span>SPD: {actor.baseSPD}</span>
                    <span>THREAT: {actor.baseThreat}</span>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 4 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>
                    解锁条件: {actor.unlockCost}G + 好感度 {actor.unlockAffection}
                  </div>
                  <button
                    onClick={() => unlockActor(actor.actorId)}
                    disabled={!canUnlock}
                    style={{
                      padding: '4px 14px', borderRadius: 4, border: 'none',
                      background: canUnlock ? '#ff9800' : '#333',
                      color: canUnlock ? '#fff' : '#666',
                      fontSize: 12, cursor: canUnlock ? 'pointer' : 'default',
                    }}
                  >
                    解锁 ({actor.unlockCost}G)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 4,
  border: 'none',
  background: '#333',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 12,
};
