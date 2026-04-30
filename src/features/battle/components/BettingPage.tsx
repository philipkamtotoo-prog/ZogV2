import { useState } from 'react';
import { useBattleStore } from '../battleStore';
import { useLoungeStore } from '../../lounge/loungeStore';
import { calculateOdds, MAX_BET_AMOUNT, MIN_BET_AMOUNT } from '../../../core/economy/betting';
import { MUTATION_LIQUID_COST } from '../../../core/battle/programMutations';

export function BettingPage() {
  const {
    battleState,
    placeBet,
    confirmBet,
    betSlip,
    startBattle,
    rerollActors,
    buyMutationLiquid,
    selectMutation,
    setActorPromptInjection,
    mutationCandidates,
    selectedMutation,
    actorPromptInjections,
  } = useBattleStore();
  const gold = useLoungeStore((s) => s.gold);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(MIN_BET_AMOUNT);
  const [promptActorId, setPromptActorId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');

  if (!battleState) return <div style={{ padding: 24, color: '#888' }}>Loading...</div>;

  const actors = battleState.actors;
  const canBet = selectedActor && betAmount >= MIN_BET_AMOUNT && betAmount <= MAX_BET_AMOUNT && betAmount <= gold && !betSlip;
  const mustPickMutation = mutationCandidates.length > 0 && !selectedMutation;

  const handleConfirmAndStart = () => {
    if (betSlip && !betSlip.locked) {
      confirmBet();
    }
    if (!mustPickMutation) startBattle();
  };

  const handleSavePrompt = () => {
    if (!promptActorId) return;
    setActorPromptInjection(promptActorId, promptText);
    setPromptText('');
  };

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#ffeb3b', margin: 0 }}>Episode Setup</h2>
          <div style={{ color: '#888', fontSize: 12 }}>Gold: {gold}G</div>
        </div>
        <button onClick={rerollActors} disabled={gold < 200 || Boolean(betSlip)} style={buttonStyle(gold >= 200 && !betSlip)}>
          Reroll actors -200G
        </button>
      </header>

      <section style={sectionStyle}>
        <div style={sectionTitleStyle}>Actors and Odds</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actors.map((actor) => {
            const odds = calculateOdds(actor, actors);
            const isSelected = selectedActor === actor.actorId;
            const injected = actorPromptInjections.find((p) => p.actorId === actor.actorId);
            return (
              <button
                key={actor.actorId}
                onClick={() => setSelectedActor(actor.actorId)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: isSelected ? '2px solid #ffeb3b' : '1px solid #333',
                  background: isSelected ? '#2a2a0a' : '#1a1a2e',
                  color: '#eee',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontWeight: 'bold' }}>{actor.name}</span>
                  <span style={{ color: '#ff9800', fontWeight: 'bold' }}>x{odds.toFixed(1)}</span>
                </div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  HP:{actor.maxHP} ATK:{actor.ATK} DEF:{actor.DEF} SPD:{actor.SPD} THREAT:{actor.baseThreat}
                </div>
                {injected && <div style={{ color: '#81c784', fontSize: 11 }}>Prompt injected</div>}
              </button>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionTitleStyle}>Temporary Actor Prompt</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={promptActorId ?? ''}
            onChange={(e) => setPromptActorId(e.target.value || null)}
            style={inputStyle}
          >
            <option value="">Choose actor</option>
            {actors.map((actor) => <option key={actor.actorId} value={actor.actorId}>{actor.name}</option>)}
          </select>
          <input
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="This episode only..."
            style={{ ...inputStyle, flex: 1, minWidth: 260 }}
          />
          <button onClick={handleSavePrompt} disabled={!promptActorId} style={buttonStyle(Boolean(promptActorId))}>
            Inject
          </button>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionTitleStyle}>Mutation Liquid</div>
        {!selectedMutation && mutationCandidates.length === 0 && (
          <button onClick={buyMutationLiquid} disabled={gold < MUTATION_LIQUID_COST} style={buttonStyle(gold >= MUTATION_LIQUID_COST)}>
            Buy candidates -{MUTATION_LIQUID_COST}G
          </button>
        )}
        {!selectedMutation && mutationCandidates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mutationCandidates.map((mutation) => (
              <button key={mutation.mutationId} onClick={() => selectMutation(mutation.mutationId)} style={buttonStyle(true)}>
                {mutation.name}: {mutation.description}
              </button>
            ))}
          </div>
        )}
        {selectedMutation && (
          <div style={{ color: '#81c784', fontSize: 13 }}>
            Selected: <b>{selectedMutation.name}</b> - {selectedMutation.description}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionTitleStyle}>Bet</div>
        {!betSlip && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={MIN_BET_AMOUNT}
              max={MAX_BET_AMOUNT}
              style={{ ...inputStyle, width: 110 }}
            />
            <span style={{ color: '#888', fontSize: 12 }}>Range {MIN_BET_AMOUNT}-{MAX_BET_AMOUNT}G</span>
            <button onClick={() => selectedActor && placeBet(selectedActor, betAmount)} disabled={!canBet} style={buttonStyle(Boolean(canBet))}>
              Place bet
            </button>
          </div>
        )}
        {betSlip && (
          <div style={{ color: '#ccc', fontSize: 13 }}>
            Bet locked in setup: {actors.find((a) => a.actorId === betSlip.actorId)?.name} | {betSlip.amount}G | x{betSlip.odds.toFixed(1)}
          </div>
        )}
      </section>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleConfirmAndStart} disabled={mustPickMutation} style={{ ...buttonStyle(!mustPickMutation), flex: 1 }}>
          {betSlip ? 'Confirm and Start' : 'Start without bet'}
        </button>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: '1px solid #333',
  background: '#151528',
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#88ccff',
  fontSize: 12,
  fontWeight: 'bold',
  marginBottom: 8,
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 4,
  border: '1px solid #444',
  background: '#0f0f23',
  color: '#eee',
};

function buttonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 4,
    border: 'none',
    background: enabled ? '#ff9800' : '#333',
    color: enabled ? '#fff' : '#777',
    cursor: enabled ? 'pointer' : 'default',
    fontWeight: 'bold',
  };
}
