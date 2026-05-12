/**
 * 功能备注：战斗页右侧三个小工具按钮打开的大浮层。
 * 负责全记录流、本局资料、战斗设置浮层内容，不负责按钮位置和主舞台布局。
 */
import { DEFAULT_ROSTER } from '../../actors/actorRoster';
import type { ActorCombatState, DramaBeat, ReporterMemoryEntry } from '../../../core/battle/types';
import type { DisplayEvent } from '../display/displayTypes';
import { GameOverlayPanel } from '../../../shared/game-ui';
import { displayEventTitle, eventKindLabel, stripReporterLabel, uniqueBy } from './battleDisplayUtils';
import type { BattleOverlay, BattleSpeedOption, ReporterReportCard } from './battleUiTypes';

interface BattleOverlayPanelProps {
  activeOverlay: Exclude<BattleOverlay, null>;
  actors: ActorCombatState[];
  avatarPlaceholderSrc: string;
  battleSpeedMs: number;
  currentBeat?: DramaBeat;
  displayLog: DisplayEvent[];
  isPlaying: boolean;
  onClose: () => void;
  pauseBattle: () => void;
  reporterMemory: ReporterMemoryEntry[];
  reporterReports: ReporterReportCard[];
  resumeBattle: () => void;
  runMode: 'AUTO' | 'MANUAL';
  setBattleSpeed: (ms: number) => void;
  speedButtons: readonly BattleSpeedOption[];
  startAuto: () => void;
  switchToManual: () => void;
}

export function BattleOverlayPanel({
  activeOverlay,
  actors,
  avatarPlaceholderSrc,
  battleSpeedMs,
  currentBeat,
  displayLog,
  isPlaying,
  onClose,
  pauseBattle,
  reporterMemory,
  reporterReports,
  resumeBattle,
  runMode,
  setBattleSpeed,
  speedButtons,
  startAuto,
  switchToManual,
}: BattleOverlayPanelProps) {
  const title =
    activeOverlay === 'records'
      ? '全记录流'
      : activeOverlay === 'briefing'
        ? '本局资料'
        : '战斗设置';

  return (
    <GameOverlayPanel classNamePrefix="battle-overlay" onClose={onClose} title={title}>
      {activeOverlay === 'records' ? (
        <AllRecordsOverlay currentBeat={currentBeat} displayLog={displayLog} reporterMemory={reporterMemory} reporterReports={reporterReports} />
      ) : null}
      {activeOverlay === 'briefing' ? (
        <BattleBriefingOverlay actors={actors} avatarPlaceholderSrc={avatarPlaceholderSrc} currentBeat={currentBeat} displayLog={displayLog} />
      ) : null}
      {activeOverlay === 'settings' ? (
        <BattleSettingsOverlay
          battleSpeedMs={battleSpeedMs}
          isPlaying={isPlaying}
          pauseBattle={pauseBattle}
          resumeBattle={resumeBattle}
          runMode={runMode}
          setBattleSpeed={setBattleSpeed}
          speedButtons={speedButtons}
          startAuto={startAuto}
          switchToManual={switchToManual}
        />
      ) : null}
    </GameOverlayPanel>
  );
}

function AllRecordsOverlay({
  currentBeat,
  displayLog,
  reporterMemory,
  reporterReports,
}: {
  currentBeat?: DramaBeat;
  displayLog: DisplayEvent[];
  reporterMemory: ReporterMemoryEntry[];
  reporterReports: ReporterReportCard[];
}) {
  const records = buildAllRecordItems(currentBeat, displayLog, reporterMemory, reporterReports);

  return (
    <div className="battle-overlay-scroll battle-records-grid">
      {records.map((item) => (
        <article className={`battle-brief-card battle-record-card is-${item.tone}`} key={item.id}>
          <span>{item.label}</span>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function BattleBriefingOverlay({
  actors,
  avatarPlaceholderSrc,
  currentBeat,
  displayLog,
}: {
  actors: ActorCombatState[];
  avatarPlaceholderSrc: string;
  currentBeat?: DramaBeat;
  displayLog: DisplayEvent[];
}) {
  const dramaBeats = buildDramaBeatRecords(currentBeat, displayLog);
  const rosterById = new Map(DEFAULT_ROSTER.map((actor) => [actor.actorId, actor]));

  return (
    <div className="battle-overlay-split">
      <section>
        <h3>DramaBeat</h3>
        <div className="battle-overlay-scroll">
          {dramaBeats.map((item) => (
            <article className="battle-brief-card" key={item.id}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h3>演员介绍</h3>
        <div className="battle-overlay-scroll">
          {actors.map((actor) => {
            const rosterActor = rosterById.get(actor.actorId);
            return (
              <article className="battle-actor-brief-card" key={actor.actorId}>
                <img alt="" src={avatarPlaceholderSrc} />
                <div>
                  <strong>{actor.name}</strong>
                  <span>{rosterActor?.title ?? 'Battle cast'}</span>
                  <p>{rosterActor?.bio ?? '本局演员介绍待补充。'}</p>
                  <small>HP {actor.currentHP}/{actor.maxHP} · ATK {actor.ATK} · DEF {actor.DEF} · SPD {actor.SPD}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BattleSettingsOverlay({
  battleSpeedMs,
  isPlaying,
  pauseBattle,
  resumeBattle,
  runMode,
  setBattleSpeed,
  speedButtons,
  startAuto,
  switchToManual,
}: {
  battleSpeedMs: number;
  isPlaying: boolean;
  pauseBattle: () => void;
  resumeBattle: () => void;
  runMode: 'AUTO' | 'MANUAL';
  setBattleSpeed: (ms: number) => void;
  speedButtons: readonly BattleSpeedOption[];
  startAuto: () => void;
  switchToManual: () => void;
}) {
  return (
    <div className="battle-settings-content">
      <section>
        <h3>速度</h3>
        <div className="battle-settings-row">
          {speedButtons.map((speed) => (
            <button className={battleSpeedMs === speed.ms ? 'is-active' : ''} key={speed.ms} onClick={() => setBattleSpeed(speed.ms)} type="button">
              {speed.label}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>播放</h3>
        <div className="battle-settings-row">
          <button onClick={isPlaying ? pauseBattle : resumeBattle} type="button">{isPlaying ? '暂停' : '恢复'}</button>
          <button className={runMode === 'MANUAL' ? 'is-active' : ''} onClick={switchToManual} type="button">手动</button>
          <button className={runMode === 'AUTO' ? 'is-active' : ''} onClick={startAuto} type="button">自动</button>
        </div>
      </section>
      <p>设置按钮已经接入战斗控制；后续如果做独立设置页，可以从这里替换为页面跳转或更完整的设置面板。</p>
    </div>
  );
}

type OverlayRecordItem = {
  id: string;
  actionIndex: number;
  label: string;
  title: string;
  text: string;
  tone: 'actor' | 'broadcast' | 'reporter' | 'beat';
};

function buildAllRecordItems(
  currentBeat: DramaBeat | undefined,
  displayLog: DisplayEvent[],
  reporterMemory: ReporterMemoryEntry[],
  reporterReports: ReporterReportCard[],
): OverlayRecordItem[] {
  const currentBeatItems: OverlayRecordItem[] = currentBeat
    ? [{
        id: `current-beat-${currentBeat.beatId}`,
        actionIndex: currentBeat.startedAtActionIndex,
        label: currentBeat.type,
        title: currentBeat.title,
        text: stripReporterLabel(currentBeat.text),
        tone: 'beat',
      }]
    : [];

  return uniqueBy(
    [
      ...currentBeatItems,
      ...displayLog.map((item) => ({
        id: item.eventId,
        actionIndex: item.actorActionIndex,
        label: `#${item.actorActionIndex} ${eventKindLabel(item.kind)}`,
        title: displayEventTitle(item),
        text: item.content,
        tone: item.kind === 'BROADCAST' ? 'broadcast' : item.kind === 'REPORTER' ? 'reporter' : 'actor',
      }) satisfies OverlayRecordItem),
      ...reporterMemory.map((item) => ({
        id: item.memoryId,
        actionIndex: item.actorActionIndex,
        label: `#${item.actorActionIndex} ${item.type}`,
        title: item.title,
        text: stripReporterLabel(item.text),
        tone: item.type === 'STAGE_BRIEF' ? 'broadcast' : 'reporter',
      }) satisfies OverlayRecordItem),
      ...reporterReports.map((item) => ({
        id: item.id,
        actionIndex: item.actionIndex,
        label: `#${item.actionIndex || 'LIVE'} LIVE REPORT`,
        title: item.title,
        text: item.content,
        tone: 'reporter',
      }) satisfies OverlayRecordItem),
    ],
    (item) => `${item.label}|${item.title}|${item.text}`,
  )
    .sort((a, b) => b.actionIndex - a.actionIndex)
    .slice(0, 80);
}

function buildDramaBeatRecords(currentBeat: DramaBeat | undefined, displayLog: DisplayEvent[]) {
  return uniqueBy(
    [
      ...(currentBeat
        ? [{
            id: currentBeat.beatId,
            label: `${currentBeat.type} · #${currentBeat.startedAtActionIndex}-${currentBeat.expiresAtActionIndex}`,
            title: currentBeat.title,
            text: stripReporterLabel(currentBeat.text),
          }]
        : []),
      ...displayLog
        .filter((item) => item.kind === 'BROADCAST' && !item.content.startsWith('Director signal:'))
        .map((item) => ({
          id: item.eventId,
          label: `#${item.actorActionIndex} DRAMABEAT`,
          title: 'DramaBeat 播报',
          text: stripReporterLabel(item.content),
        })),
    ],
    (item) => `${item.label}|${item.text}`,
  ).sort((a, b) => {
    const actionA = Number(a.label.match(/#(\d+)/)?.[1] ?? 0);
    const actionB = Number(b.label.match(/#(\d+)/)?.[1] ?? 0);
    return actionB - actionA;
  });
}
