import { useEffect } from 'react';
import { useBattleStore } from '../battleStore';
import { ActorPanel } from './ActorPanel';
import { BattleControls } from './BattleControls';
import { CommandInput } from './CommandInput';
import { DodoScoreboard } from './DodoScoreboard';
import { DisplayLog } from './DisplayLog';
import { ItemPanel } from './ItemPanel';

export function BattlePage() {
  const {
    battleState,
    displayLog,
    commandInput,
    commandStatus,
    isProcessing,
    startBattle,
    pauseBattle,
    resumeBattle,
    stepBattle,
    startAuto,
    submitCommand,
    setCommandInput,
  } = useBattleStore();

  useEffect(() => {
    if (battleState?.phase === 'PREPARING') {
      startBattle();
    }
  }, [battleState?.phase, startBattle]);

  if (!battleState) {
    return <div style={{ color: '#888', padding: 20 }}>No battle loaded.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 12, gap: 8 }}>
      <BattleControls
        phase={battleState.phase}
        clockState={battleState.clockState}
        runMode={battleState.runMode}
        actorActionIndex={battleState.actorActionIndex}
        isProcessing={isProcessing}
        onStart={startBattle}
        onPause={pauseBattle}
        onResume={resumeBattle}
        onStep={stepBattle}
        onAuto={startAuto}
      />

      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {battleState.actors.map((actor) => (
              <ActorPanel key={actor.actorId} actor={actor} />
            ))}
          </div>

          <DisplayLog items={displayLog} />

          <ItemPanel />

          {battleState.phase === 'RUNNING' && (
            <CommandInput
              value={commandInput}
              onChange={setCommandInput}
              onSubmit={submitCommand}
              disabled={isProcessing}
              status={commandStatus}
            />
          )}
        </div>

        <DodoScoreboard actors={battleState.actors} scene={battleState.scene} />
      </div>
    </div>
  );
}
