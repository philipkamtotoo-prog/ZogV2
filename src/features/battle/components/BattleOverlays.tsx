/**
 * 功能备注：战斗页右侧三个小工具按钮打开的大浮层。
 * 负责全记录流、本局资料、战斗设置浮层内容，不负责按钮位置和主舞台布局。
 */
import { DEFAULT_ROSTER } from '../../actors/actorRoster';
import type { ActorCombatState, DramaBeat, ReporterMemoryEntry } from '../../../core/battle/types';
import type { DisplayEvent } from '../display/displayTypes';
import { GameOverlayPanel } from '../../../shared/game-ui';
import { useMemo, useRef } from 'react';
import { eventKindLabel, stripReporterLabel, uniqueBy } from './battleDisplayUtils';
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
        <AllRecordsOverlay displayLog={displayLog} reporterMemory={reporterMemory} />
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
  displayLog,
  reporterMemory,
}: {
  displayLog: DisplayEvent[];
  reporterMemory: ReporterMemoryEntry[];
}) {
  const roundRecords = useMemo(() => buildRoundRecordItems(displayLog, reporterMemory), [displayLog, reporterMemory]);
  const jumpTargets = useMemo(() => buildRoundJumpTargets(roundRecords), [roundRecords]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const roundRefs = useRef(new Map<number, HTMLElement>());

  const scrollToRound = (target: number) => {
    const round = findJumpRound(roundRecords, target);
    const list = listRef.current;
    if (!round) return;
    const node = roundRefs.current.get(round.actionIndex);
    if (!list || !node) return;
    list.scrollTo({
      top: node.offsetTop - list.offsetTop,
      behavior: 'smooth',
    });
  };

  return (
    <div className="battle-records-shell">
      <div className="battle-overlay-scroll battle-records-list" ref={listRef}>
        {roundRecords.map((round) => (
          <article
            className="battle-record-round-card"
            key={round.actionIndex}
            ref={(node) => {
              if (node) roundRefs.current.set(round.actionIndex, node);
              else roundRefs.current.delete(round.actionIndex);
            }}
          >
            <header className="battle-record-round-header">
              <span>#{round.actionIndex}</span>
              <strong>{round.sections.map((section) => section.title).join(' / ')}</strong>
            </header>
            <div className="battle-record-round-sections">
              {round.sections.map((section) => (
                <section className={`battle-record-section is-${section.tone}`} key={section.id}>
                  <strong>{section.title}</strong>
                  {section.items.map((item) => (
                    <p key={item.id}>
                      <span>{item.label}</span>
                      {item.text}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </article>
        ))}
        {roundRecords.length === 0 ? (
          <div className="battle-record-empty">No battle records yet.</div>
        ) : null}
      </div>
      <nav className="battle-record-jump-rail" aria-label="Round jumps">
        {jumpTargets.map((target) => (
          <button
            key={target}
            onClick={(event) => {
              event.preventDefault();
              scrollToRound(target);
            }}
            type="button"
          >
            #{target}
          </button>
        ))}
      </nav>
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

type RoundRecordTone = 'actor' | 'player' | 'scene' | 'brief';

type RoundRecordLine = {
  id: string;
  label: string;
  text: string;
};

type RoundRecordSection = {
  id: RoundRecordTone;
  title: string;
  tone: RoundRecordTone;
  items: RoundRecordLine[];
};

type RoundRecord = {
  actionIndex: number;
  sections: RoundRecordSection[];
};

type RoundDraft = Record<RoundRecordTone, RoundRecordLine[]>;

const ROUND_SECTION_ORDER: RoundRecordTone[] = ['actor', 'player', 'scene', 'brief'];
const ROUND_SECTION_TITLES: Record<RoundRecordTone, string> = {
  actor: '演员行动',
  player: '玩家操作',
  scene: '场面变化',
  brief: '快报',
};

function buildRoundRecordItems(displayLog: DisplayEvent[], reporterMemory: ReporterMemoryEntry[]): RoundRecord[] {
  const drafts = new Map<number, RoundDraft>();

  for (const item of displayLog) {
    const line = displayEventToRoundLine(item);
    if (!line) continue;
    pushRoundLine(drafts, item.actorActionIndex, line.tone, line.item);
  }

  for (const memory of reporterMemory) {
    if (memory.type !== 'STAGE_BRIEF' || memory.tags.includes('beat')) continue;
    pushRoundLine(drafts, memory.actorActionIndex, 'brief', {
      id: memory.memoryId,
      label: memory.title,
      text: stripReporterLabel(memory.text),
    });
  }

  return [...drafts.entries()]
    .map(([actionIndex, draft]) => ({
      actionIndex,
      sections: ROUND_SECTION_ORDER
        .map((tone) => ({
          id: tone,
          title: ROUND_SECTION_TITLES[tone],
          tone,
          items: uniqueBy(draft[tone], (item) => `${item.label}|${item.text}`),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((round) => round.sections.length > 0)
    .sort((a, b) => b.actionIndex - a.actionIndex)
    .slice(0, 80);
}

function pushRoundLine(drafts: Map<number, RoundDraft>, actionIndex: number, tone: RoundRecordTone, item: RoundRecordLine) {
  const draft = drafts.get(actionIndex) ?? { actor: [], player: [], scene: [], brief: [] };
  draft[tone].push(item);
  drafts.set(actionIndex, draft);
}

function displayEventToRoundLine(item: DisplayEvent): { tone: RoundRecordTone; item: RoundRecordLine } | null {
  if (item.kind === 'REPORTER' || item.kind === 'ZOG') return null;

  const baseLine = {
    id: item.eventId,
    label: eventKindLabel(item.kind),
    text: stripReporterLabel(item.content),
  };

  if (item.kind === 'ITEM' || item.kind === 'HEAL' || item.kind === 'PROMPT') {
    return { tone: 'player', item: baseLine };
  }

  if (item.kind === 'BROADCAST') {
    const isDirectorSignal = item.content.startsWith('Director signal:');
    return {
      tone: isDirectorSignal ? 'player' : 'scene',
      item: {
        ...baseLine,
        label: isDirectorSignal ? '导演指令' : 'DramaBeat',
        text: stripReporterLabel(item.content.replace(/^Director signal:\s*/, '')),
      },
    };
  }

  if (item.kind === 'MUTATION') {
    return {
      tone: 'scene',
      item: {
        ...baseLine,
        label: 'Mutation',
      },
    };
  }

  return { tone: 'actor', item: baseLine };
}

function buildRoundJumpTargets(roundRecords: RoundRecord[]): number[] {
  if (!roundRecords.length) return [];
  const indexes = roundRecords.map((round) => round.actionIndex);
  const min = Math.min(...indexes);
  const max = Math.max(...indexes);
  const targets: number[] = [];

  for (let target = Math.floor(max / 5) * 5; target >= min; target -= 5) {
    targets.push(target);
  }

  return targets.length > 0 ? targets : [max];
}

function findJumpRound(roundRecords: RoundRecord[], target: number): RoundRecord | undefined {
  return roundRecords.find((round) => round.actionIndex <= target) ?? roundRecords[roundRecords.length - 1];
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
