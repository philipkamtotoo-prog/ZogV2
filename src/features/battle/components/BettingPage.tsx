import { useState } from 'react';
import { useBattleStore } from '../battleStore';
import { useLoungeStore } from '../../lounge/loungeStore';
import { calculateOdds } from '../../../core/economy/betting';

export function BettingPage() {
  const { battleState, placeBet, confirmBet, betSlip, startBattle } = useBattleStore();
  const { gold, spendGold } = useLoungeStore();
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(10);

  if (!battleState) return <div style={{ padding: 24, color: '#888' }}>Loading...</div>;

  const actors = battleState.actors;

  const handlePlaceBet = () => {
    if (!selectedActor) return;
    if (betAmount > gold || betAmount <= 0) return;
    placeBet(selectedActor, betAmount);
  };

  const handleConfirmAndStart = () => {
    if (betSlip && !betSlip.locked) {
      if (!spendGold(betSlip.amount)) return;
      confirmBet();
    }
    startBattle();
  };

  const handleSkipBet = () => {
    startBattle();
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ color: '#ffeb3b', textAlign: 'center', marginBottom: 4 }}>赛前押注</h2>
      <p style={{ color: '#888', textAlign: 'center', fontSize: 13, marginBottom: 20 }}>
        选择你看好的演员，赢了翻倍！（可跳过）
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {actors.map((actor) => {
          const odds = calculateOdds(actor, actors);
          const isSelected = selectedActor === actor.actorId;
          return (
            <div
              key={actor.actorId}
              onClick={() => setSelectedActor(actor.actorId)}
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                border: isSelected ? '2px solid #ffeb3b' : '1px solid #333',
                background: isSelected ? '#2a2a0a' : '#1a1a2e',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ color: '#eee', fontWeight: 'bold' }}>{actor.name}</span>
                <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                  ATK:{actor.ATK} DEF:{actor.DEF} SPD:{actor.SPD}
                </span>
              </div>
              <span style={{ color: '#ff9800', fontWeight: 'bold' }}>x{odds.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      {selectedActor && !betSlip && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#888', fontSize: 13 }}>下注金额：</span>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
            min={1}
            max={gold}
            style={{
              width: 80, padding: '6px 8px', borderRadius: 4,
              border: '1px solid #444', background: '#1a1a1a', color: '#ffeb3b',
              fontSize: 14, textAlign: 'center',
            }}
          />
          <span style={{ color: '#888', fontSize: 12 }}>/ {gold}G</span>
          <button
            onClick={handlePlaceBet}
            disabled={betAmount > gold || betAmount <= 0}
            style={{
              padding: '6px 16px', borderRadius: 4, border: 'none',
              background: '#ff9800', color: '#fff', fontWeight: 'bold',
              cursor: betAmount <= gold ? 'pointer' : 'default',
              opacity: betAmount <= gold ? 1 : 0.5,
            }}
          >
            下注
          </button>
        </div>
      )}

      {betSlip && (
        <div style={{
          padding: 12, borderRadius: 6, background: '#1a2a1a', border: '1px solid #4caf50',
          marginBottom: 16, fontSize: 13, color: '#ccc',
        }}>
          已选: <b style={{ color: '#eee' }}>
            {actors.find((a) => a.actorId === betSlip.actorId)?.name}
          </b> |
          下注: <b style={{ color: '#ffeb3b' }}>{betSlip.amount}G</b> |
          赔率: <b style={{ color: '#ff9800' }}>x{betSlip.odds.toFixed(1)}</b> |
          最高可赢: <b style={{ color: '#4caf50' }}>{Math.floor(betSlip.amount * betSlip.odds)}G</b>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleConfirmAndStart}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
            background: '#4caf50', color: '#fff', fontSize: 14,
            fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          {betSlip ? '确认押注并开始' : '开始战斗'}
        </button>
        {!betSlip && (
          <button
            onClick={handleSkipBet}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
              background: '#555', color: '#ccc', fontSize: 14, cursor: 'pointer',
            }}
          >
            跳过押注
          </button>
        )}
      </div>
    </div>
  );
}
