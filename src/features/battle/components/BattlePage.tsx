import { useEffect } from 'react';
import { useBattleStore } from '../battleStore';
import { BattlePixiCanvas } from '../renderer/BattlePixiCanvas';
import { ActorPanel } from './ActorPanel';
import { BattleControls } from './BattleControls';
import { CommandInput } from './CommandInput';
import { DodoScoreboard } from './DodoScoreboard';
import { DisplayLog } from './DisplayLog';
import { ItemPanel } from './ItemPanel';
import { ZogNoteOverlay } from './ZogNoteOverlay';

export function BattlePage() {
  const {
    battleState,
    displayLog,
    battleSpeedMs,
    commandInput,
    commandStatus,
    isProcessing,
    startBattle,
    pauseBattle,
    resumeBattle,
    stepBattle,
    startAuto,
    setBattleSpeed,
    submitCommand,
    setCommandInput,
    resolveAsk,
    cancelAsk,
    liveReport,
    clearLiveReport,
    engine,
    engineId,
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 12, gap: 8, position: 'relative' }}>
      <BattleControls
        phase={battleState.phase}
        clockState={battleState.clockState}
        runMode={battleState.runMode}
        battleSpeedMs={battleSpeedMs}
        actorActionIndex={battleState.actorActionIndex}
        isProcessing={isProcessing}
        onStart={startBattle}
        onPause={pauseBattle}
        onResume={resumeBattle}
        onStep={stepBattle}
        onAuto={startAuto}
        onSpeedChange={setBattleSpeed}
      />

      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Pixi 战场舞台 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <BattlePixiCanvas
                battleState={battleState}
                displayLog={displayLog}
                engineId={engineId}
                width={600}
                height={400}
              />
            </div>
            {/* React 调试区：角色面板 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200, alignContent: 'flex-start' }}>
              {battleState.actors.map((actor) => (
                <ActorPanel key={actor.actorId} actor={actor} />
              ))}
            </div>
          </div>

          <DisplayLog items={displayLog} actors={battleState.actors} />

          <ItemPanel />

          {battleState.phase === 'RUNNING' && (
            <CommandInput
              value={commandInput}
              onChange={setCommandInput}
              onSubmit={submitCommand}
              onResolveAsk={resolveAsk}
              onCancelAsk={cancelAsk}
              disabled={isProcessing}
              status={commandStatus}
              askTargetQuestion={commandStatus === 'WAITING_CLARIFICATION' ? engine?.getPendingAskTransaction()?.targetQuestion : undefined}
              askTargetOptions={commandStatus === 'WAITING_CLARIFICATION' ? engine?.getPendingAskTransaction()?.targetOptions : undefined}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
          <DodoScoreboard actors={battleState.actors} scene={battleState.scene} />
          <ZogNoteOverlay />
        </div>
      </div>

      {liveReport && (
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          maxWidth: 500,
          background: 'rgba(26, 26, 46, 0.95)',
          border: '2px solid #e91e63',
          boxShadow: '0 0 30px rgba(233, 30, 99, 0.6)',
          borderRadius: 12,
          padding: 24,
          zIndex: 1000,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ color: '#e91e63', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                🎙️ 首席战地记者实时播报
              </div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{liveReport.headline}</h3>
            </div>
            <button
              onClick={clearLiveReport}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 24, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <p style={{ color: '#eee', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            {liveReport.summary}
          </p>
        </div>
      )}
    </div>
  );
}
