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
import './BattlePage.css';

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
    return <div className="battle-empty-page">No battle loaded.</div>;
  }

  const aliveCount = battleState.actors.filter((actor) => actor.isAlive).length;

  return (
    <div className="battle-page">
      <header className="battle-topbar">
        <div className="battle-title-block">
          <span className="battle-kicker">Live Battle</span>
          <h1>Dodo Riot Stage</h1>
        </div>

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
      </header>

      <main className="battle-director-layout">
        <section className="battle-stage-shell" aria-label="Battle stage">
          <div className="battle-stage-meta">
            <div>
              <span>Action</span>
              <strong>#{battleState.actorActionIndex}</strong>
            </div>
            <div>
              <span>Alive</span>
              <strong>{aliveCount}/{battleState.actors.length}</strong>
            </div>
            <div>
              <span>Wild dodos</span>
              <strong>{battleState.scene.wildDodos}</strong>
            </div>
          </div>

          <div className="battle-stage-frame">
            <BattlePixiCanvas
              battleState={battleState}
              displayLog={displayLog}
              engineId={engineId}
              width={960}
              height={560}
            />
          </div>
        </section>

        <aside className="battle-status-rail" aria-label="Battle status">
          <DodoScoreboard actors={battleState.actors} scene={battleState.scene} />
          <div className="battle-actor-roster">
            <div className="battle-panel-heading">
              <span>Cast Status</span>
              <strong>{aliveCount}</strong>
            </div>
            <div className="battle-actor-grid">
              {battleState.actors.map((actor) => (
                <ActorPanel key={actor.actorId} actor={actor} />
              ))}
            </div>
          </div>
          <ZogNoteOverlay />
        </aside>
      </main>

      <section className="battle-lower-deck">
        <DisplayLog items={displayLog} actors={battleState.actors} />

        <aside className="battle-control-desk" aria-label="Director controls">
          <div className="battle-panel-heading">
            <span>Intervention Desk</span>
            <strong>{battleState.itemUsesRemaining}</strong>
          </div>
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
        </aside>
      </section>

      {liveReport && (
        <div className="battle-live-report">
          <div className="battle-live-report-header">
            <div>
              <span>Field Reporter</span>
              <h3>{liveReport.headline}</h3>
            </div>
            <button onClick={clearLiveReport} aria-label="Close live report">
              x
            </button>
          </div>
          <p>{liveReport.summary}</p>
        </div>
      )}
    </div>
  );
}
