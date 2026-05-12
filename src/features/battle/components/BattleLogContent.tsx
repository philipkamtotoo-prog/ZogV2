/**
 * 功能备注：战斗页下方三 Tab 内容区。
 * 负责详细日志、导演和快报、战地记者列表/正文的展示逻辑，不负责舞台坐标摆放。
 */
import type { ActorCombatState, DramaBeat, ReporterMemoryEntry } from '../../../core/battle/types';
import type { DisplayEvent } from '../display/displayTypes';
import { reportFingerprint, stripReporterLabel, uniqueBy } from './battleDisplayUtils';
import type { BattleLogTab, ReporterReportCard } from './battleUiTypes';

interface BattleLogContentProps {
  activeTab: BattleLogTab;
  actors: ActorCombatState[];
  avatarPlaceholderSrc: string;
  currentBeat?: DramaBeat;
  displayLog: DisplayEvent[];
  openReporterId: string | null;
  reporterMemory: ReporterMemoryEntry[];
  reporterReports: ReporterReportCard[];
  reportCardSrc: string;
  setOpenReporterId: (id: string | null) => void;
}

export function BattleLogContent({
  activeTab,
  actors,
  avatarPlaceholderSrc,
  currentBeat,
  displayLog,
  openReporterId,
  reporterMemory,
  reporterReports,
  reportCardSrc,
  setOpenReporterId,
}: BattleLogContentProps) {
  if (activeTab === 'director') {
    return <DirectorBriefTab currentBeat={currentBeat} displayLog={displayLog} reporterMemory={reporterMemory} />;
  }

  if (activeTab === 'reporter') {
    return (
      <ReporterTab
        openReporterId={openReporterId}
        reporterReports={reporterReports}
        reportCardSrc={reportCardSrc}
        setOpenReporterId={setOpenReporterId}
      />
    );
  }

  return <ActorLogTab actors={actors} avatarPlaceholderSrc={avatarPlaceholderSrc} displayLog={displayLog} />;
}

function ActorLogTab({
  actors,
  avatarPlaceholderSrc,
  displayLog,
}: {
  actors: ActorCombatState[];
  avatarPlaceholderSrc: string;
  displayLog: DisplayEvent[];
}) {
  const actorMap = new Map(actors.map((actor) => [actor.actorId, actor]));
  const actionGroups = buildActorActionGroups(displayLog, actorMap).slice(0, 12);

  if (actionGroups.length === 0) return <div className="battle-log-empty" />;

  return (
    <div className="battle-actor-log-content">
      {actionGroups.map((group) => {
        const actor = group.actorId ? actorMap.get(group.actorId) : undefined;
        return (
          <article className="battle-actor-log-card" key={group.id}>
            <img alt="" src={avatarPlaceholderSrc} />
            <div>
              <header>
                <strong>{actor?.name ?? 'Unknown Actor'}</strong>
                <span>#{group.actorActionIndex} {actorMoodLabel(actor)}</span>
              </header>
              <div className="battle-actor-log-lines">
                {group.items.map((item) => (
                  <p key={item.eventId}>
                    <b>{actorEventLabel(item)}</b>
                    <span>{item.content}</span>
                  </p>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DirectorBriefTab({
  currentBeat,
  displayLog,
  reporterMemory,
}: {
  currentBeat?: DramaBeat;
  displayLog: DisplayEvent[];
  reporterMemory: ReporterMemoryEntry[];
}) {
  const directorItems = uniqueBy(
    [
      ...(currentBeat
        ? [{
            id: currentBeat.beatId,
            title: currentBeat.title,
            label: currentBeat.type,
            text: stripReporterLabel(currentBeat.text),
          }]
        : [{
            id: 'empty-beat',
            title: '等待节目节奏',
            label: 'DODO_RIOT_STAGE',
            text: '暂无导演快报。',
          }]),
      ...displayLog
        .filter((item) => item.kind === 'BROADCAST' && !item.content.startsWith('Director signal:'))
        .slice(-12)
        .reverse()
        .map((item) => ({
          id: item.eventId,
          title: `#${item.actorActionIndex} DramaBeat`,
          label: 'DRAMA_BEAT',
          text: stripReporterLabel(item.content),
        })),
    ],
    (item) => `${item.title}|${item.text}`,
  );
  const briefItems = reporterMemory
    .filter((memory) => memory.type === 'STAGE_BRIEF')
    .slice(-8)
    .reverse();

  return (
    <div className="battle-director-brief-content">
      <section>
        <h3>导演信息</h3>
        <div>
          {directorItems.map((item) => (
            <article className="battle-brief-card" key={item.id}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h3>快报信息</h3>
        <div>
          {briefItems.length > 0 ? briefItems.map((item) => (
            <article className="battle-brief-card is-status" key={item.memoryId}>
              <p>{stripReporterLabel(item.text)}</p>
            </article>
          )) : <p className="battle-panel-empty-text">暂无状态快报。</p>}
        </div>
      </section>
    </div>
  );
}

function ReporterTab({
  openReporterId,
  reporterReports,
  reportCardSrc,
  setOpenReporterId,
}: {
  openReporterId: string | null;
  reporterReports: ReporterReportCard[];
  reportCardSrc: string;
  setOpenReporterId: (id: string | null) => void;
}) {
  const uniqueReports = uniqueBy(reporterReports, (card) => reportFingerprint(card.title, card.content));
  const activeCard = uniqueReports.find((card) => card.id === openReporterId) ?? uniqueReports[0];

  if (uniqueReports.length === 0) return <div className="battle-log-empty" />;

  return (
    <div className="battle-reporter-content">
      <div className="battle-reporter-card-list">
        {uniqueReports.map((card) => (
          <button
            className={`battle-reporter-card${activeCard?.id === card.id ? ' is-open' : ''}`}
            key={card.id}
            onClick={() => setOpenReporterId(card.id)}
            type="button"
          >
            <img alt="" src={reportCardSrc} />
            <span>#{card.actionIndex || 'LIVE'}</span>
            <strong>{card.title}</strong>
          </button>
        ))}
      </div>
      <article className="battle-reporter-article">
        <span>LIVE REPORT</span>
        <h3>{activeCard?.title}</h3>
        <p>{activeCard?.content}</p>
      </article>
    </div>
  );
}

function buildActorActionGroups(displayLog: DisplayEvent[], actorMap: Map<string, ActorCombatState>) {
  const grouped = new Map<number, DisplayEvent[]>();
  for (const item of displayLog) {
    if (!isActorDetailEvent(item)) continue;
    const bucket = grouped.get(item.actorActionIndex) ?? [];
    bucket.push(item);
    grouped.set(item.actorActionIndex, bucket);
  }

  return [...grouped.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([actorActionIndex, items]) => {
      const actorId = findPrimaryActorId(items, actorMap);
      return {
        id: `actor-action-${actorActionIndex}-${actorId ?? 'unknown'}`,
        actorActionIndex,
        actorId,
        items,
      };
    });
}

function isActorDetailEvent(item: DisplayEvent): boolean {
  return (
    item.kind === 'ACTOR_LINE' ||
    item.kind === 'ACTOR_ACTION' ||
    item.kind === 'DAMAGE' ||
    item.kind === 'HEAL' ||
    item.kind === 'STATUS' ||
    item.kind === 'ELIMINATION' ||
    item.kind === 'ITEM' ||
    item.kind === 'PROMPT'
  );
}

function findPrimaryActorId(items: DisplayEvent[], actorMap: Map<string, ActorCombatState>): string | undefined {
  const activeActor = items
    .map((item) => (item.kind === 'ACTOR_LINE' || item.kind === 'ACTOR_ACTION' || item.kind === 'ITEM' || item.kind === 'PROMPT' ? item.actorId : undefined))
    .find((actorId): actorId is string => Boolean(actorId && actorMap.has(actorId)));

  if (activeActor) return activeActor;
  return items.map(getDisplayActorId).find((actorId): actorId is string => Boolean(actorId && actorMap.has(actorId)));
}

function getDisplayActorId(item: DisplayEvent): string | undefined {
  switch (item.kind) {
    case 'ACTOR_LINE':
    case 'ACTOR_ACTION':
    case 'ITEM':
    case 'PROMPT':
      return item.actorId;
    case 'DAMAGE':
    case 'HEAL':
    case 'STATUS':
    case 'ELIMINATION':
      return item.targetId;
    default:
      return undefined;
  }
}

function actorMoodLabel(actor?: ActorCombatState): string {
  if (!actor) return '心理状态未知';
  if (!actor.isAlive) return '退场';
  if (actor.currentHP <= actor.maxHP * 0.3) return '濒危紧绷';
  if (actor.statuses.length > 0) return `状态:${actor.statuses.join('/')}`;
  return '情绪稳定';
}

function actorEventLabel(item: DisplayEvent): string {
  if (item.kind === 'ACTOR_LINE') return '台词';
  if (item.kind === 'ACTOR_ACTION') return '动作';
  if (item.kind === 'DAMAGE') return '攻击';
  if (item.kind === 'HEAL') return '恢复';
  if (item.kind === 'STATUS') return '状态变化';
  if (item.kind === 'ITEM') return '道具互动';
  if (item.kind === 'PROMPT') return '人设注入';
  return item.kind;
}
