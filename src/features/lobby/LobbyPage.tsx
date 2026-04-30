import { useBattleStore } from '../battle/battleStore';

export function LobbyPage() {
  const { initBattle } = useBattleStore();

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
      <h1 style={{ color: '#ffeb3b', marginBottom: 8 }}>Zog V2</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>AI Battle Arena - Dodo Island</p>

      <button
        onClick={() => initBattle()}
        style={{
          padding: '14px 48px',
          borderRadius: 8,
          border: 'none',
          background: '#ff9800',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 'bold',
        }}
      >
        Start New Battle
      </button>

      <div style={{ marginTop: 24, fontSize: 12, color: '#555' }}>
        5 AI actors compete for dodos across 40 actions
      </div>
    </div>
  );
}
