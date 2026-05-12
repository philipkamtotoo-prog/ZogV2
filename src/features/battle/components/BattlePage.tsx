import { useEffect, useMemo } from 'react';
import { ITEM_DEFS, type ItemId } from '../../../core/economy/items';
import { useLoungeStore } from '../../lounge/loungeStore';
import { FixedStage } from '../../../shared/game-ui';
import { useBattleStore } from '../battleStore';
import { BattleCommandPanel } from './BattleCommandPanel';
import { BattleCastStatusPanel } from './BattleCastStatusPanel';
import { BattleItemSlots, type BattleOwnedItem } from './BattleItemSlots';
import { BattleLogContent } from './BattleLogContent';
import { BattleOverlayPanel } from './BattleOverlays';
import { BattlePixiCanvas } from '../renderer/BattlePixiCanvas';
import { BattleScoreboardPanel } from './BattleScoreboardPanel';
import { BattleToolButtons } from './BattleToolButtons';
import { BattleTopControls } from './BattleTopControls';
import { BattleZogSeatPanel } from './BattleZogSeatPanel';
import { useBattlePageUiState } from './useBattlePageUiState';
import {
  BATTLE_ASSETS,
  BATTLE_STAGE,
  LOG_TABS,
  PIXI_BOX,
  SPEED_BUTTONS,
  box,
} from './battlePageConfig';
import './BattleGlowEffects.css';
import './BattlePage.css';

export function BattlePage({ onOpenSettings }: { onOpenSettings?: () => void }) {
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
    switchToManual,
    setBattleSpeed,
    submitCommand,
    setCommandInput,
    resolveAsk,
    cancelAsk,
    liveReport,
    goToLobby,
    engine,
    engineId,
  } = useBattleStore();
  const inventory = useLoungeStore((state) => state.inventory);
  const gold = useLoungeStore((state) => state.gold);
  const {
    activeOverlay,
    activeTab,
    hasUnreadReporter,
    openReporterId,
    reporterReports,
    selectedItemId,
    selectLogTab,
    setActiveOverlay,
    setOpenReporterId,
    setSelectedItemId,
  } = useBattlePageUiState({
    actorActionIndex: battleState?.actorActionIndex,
    battleId: battleState?.battleId,
    liveReport,
  });

  useEffect(() => {
    if (battleState?.phase === 'PREPARING') {
      startBattle();
    }
  }, [battleState?.phase, startBattle]);

  const ownedItems = useMemo(
    (): BattleOwnedItem[] =>
      Object.entries(inventory)
        .filter(([, count]) => count > 0)
        .filter(([id]) => Boolean(ITEM_DEFS[id as ItemId]))
        .map(([id, count]) => ({ ...ITEM_DEFS[id as ItemId], count, itemId: id as ItemId })),
    [inventory],
  );

  if (!battleState) {
    return <div className="battle-empty-page">No battle loaded.</div>;
  }

  const aliveActors = battleState.actors.filter((actor) => actor.isAlive);
  const isPlaying = battleState.phase === 'RUNNING' && battleState.clockState === 'PLAYING';
  const isAskMode = commandStatus === 'WAITING_CLARIFICATION';
  const askTransaction = isAskMode ? engine?.getPendingAskTransaction() : undefined;

  return (
    <div className="battle-page">
      <FixedStage className="battle-stage" fit="cover" height={BATTLE_STAGE.height} viewportClassName="battle-viewport" width={BATTLE_STAGE.width}>
          <img alt="" className="battle-bg" src={BATTLE_ASSETS.background} />
          <div className="battle-title-glow-layer" style={box(107, 39, 258.5, 80.5)} aria-hidden="true">
            <img alt="" src={BATTLE_ASSETS.title} />
          </div>
          <img alt="" className="battle-art battle-title-art" src={BATTLE_ASSETS.title} style={box(107, 39, 258.5, 80.5)} />

          <section className="battle-pixi-slot" style={PIXI_BOX} aria-label="Pixi battle canvas">
            <BattlePixiCanvas battleState={battleState} displayLog={displayLog} engineId={engineId} width={1421} height={645} />
          </section>

          <BattleTopControls
            actionIndex={battleState.actorActionIndex}
            aliveCount={aliveActors.length}
            battleSpeedMs={battleSpeedMs}
            gold={gold}
            isPlaying={isPlaying}
            isProcessing={isProcessing}
            onClose={goToLobby}
            onPause={pauseBattle}
            onResume={resumeBattle}
            onSetBattleSpeed={setBattleSpeed}
            onStartAuto={startAuto}
            onStep={stepBattle}
            onSwitchToManual={switchToManual}
            runMode={battleState.runMode}
            totalActors={battleState.actors.length}
            totalDodos={battleState.scene.totalDodos}
            wildDodos={battleState.scene.wildDodos}
          />

          <BattleScoreboardPanel actors={battleState.actors} eventLog={battleState.eventLog} />
          <BattleCastStatusPanel actors={battleState.actors} />
          <BattleZogSeatPanel displayLog={displayLog} />

          {LOG_TABS.map((tab) => (
            <button
              className={`battle-log-tab${tab.key === 'reporter' && hasUnreadReporter ? ' has-reporter-alert' : ''}${tab.key === 'reporter' && activeTab === 'reporter' ? ' is-reporter-read' : ''}`}
              key={tab.key}
              onClick={() => {
                selectLogTab(tab.key);
              }}
              style={tab.box}
              type="button"
            >
              <img alt="" src={activeTab === tab.key ? BATTLE_ASSETS.tabActive : BATTLE_ASSETS.tabIdle} />
              <span>{tab.label}</span>
            </button>
          ))}
          <BattleToolButtons
            onOpenOverlay={setActiveOverlay}
            onOpenSettings={onOpenSettings ?? (() => setActiveOverlay('settings'))}
          />

          <section className="battle-log-panel" style={box(130, 854, 1424, 210)}>
            <BattleLogContent
              activeTab={activeTab}
              actors={battleState.actors}
              avatarPlaceholderSrc={BATTLE_ASSETS.avatarPlaceholder}
              currentBeat={battleState.currentBeat}
              displayLog={displayLog}
              openReporterId={openReporterId}
              reporterMemory={battleState.reporterMemory}
              reporterReports={reporterReports}
              reportCardSrc={BATTLE_ASSETS.reportCard}
              setOpenReporterId={setOpenReporterId}
            />
          </section>

          <BattleItemSlots ownedItems={ownedItems} onSelectItem={setSelectedItemId} selectedItemId={selectedItemId} />

          <BattleCommandPanel
            askTargetOptions={askTransaction?.targetOptions}
            askTargetQuestion={askTransaction?.targetQuestion}
            commandInput={commandInput}
            commandStatus={commandStatus}
            disabled={isProcessing || battleState.phase !== 'RUNNING'}
            isAskMode={isAskMode}
            onCancelAsk={cancelAsk}
            onChangeCommandInput={setCommandInput}
            onResolveAsk={resolveAsk}
            onSubmitCommand={submitCommand}
          />

          {activeOverlay ? (
            <BattleOverlayPanel
              activeOverlay={activeOverlay}
              actors={battleState.actors}
              avatarPlaceholderSrc={BATTLE_ASSETS.avatarPlaceholder}
              battleSpeedMs={battleSpeedMs}
              currentBeat={battleState.currentBeat}
              displayLog={displayLog}
              isPlaying={isPlaying}
              onClose={() => setActiveOverlay(null)}
              pauseBattle={pauseBattle}
              reporterMemory={battleState.reporterMemory}
              reporterReports={reporterReports}
              resumeBattle={resumeBattle}
              runMode={battleState.runMode}
              setBattleSpeed={setBattleSpeed}
              speedButtons={SPEED_BUTTONS}
              startAuto={startAuto}
              switchToManual={switchToManual}
            />
          ) : null}
      </FixedStage>
    </div>
  );
}
