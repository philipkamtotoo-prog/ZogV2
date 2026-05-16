import type { DisplayEvent } from '../display/displayTypes';
import type { BattleState } from '../../../core/battle/types';
import { assetPath } from '../../../shared/game-ui';
import { useLoungeStore } from '../../lounge/loungeStore';
import { getZogAffinityLevel } from '../../zog/zogAffinity';

const ZOG_PORTRAIT = assetPath('hub', 'zog.png');

export function BattleZogSeatPanel({
  battleState,
  displayLog,
}: {
  battleState: BattleState;
  displayLog: DisplayEvent[];
}) {
  const zogAffection = useLoungeStore((state) => state.zogAffection);
  const zogLevel = getZogAffinityLevel(zogAffection);
  const latestCue = [...displayLog].reverse().find(isZogCueEvent);
  const line = clampBubbleLine(latestCue ? buildZogLine(latestCue, battleState) : buildIdleLine(battleState));

  return (
    <section className="battle-zog-panel" aria-label="Zog's Seat">
      <div className="battle-zog-panel-title">Zog's Seat</div>
      <div className="battle-zog-bubble">
        <p>{line}</p>
      </div>
      <img className="battle-zog-portrait" alt="" src={ZOG_PORTRAIT} draggable={false} />
      <div className="battle-zog-level">Lv{zogLevel.level} {zogLevel.shortTitle}</div>
    </section>
  );
}

function isZogCueEvent(event: DisplayEvent): boolean {
  return [
    'ZOG',
    'ELIMINATION',
    'DAMAGE',
    'HEAL',
    'ITEM',
    'BROADCAST',
    'MUTATION',
    'PROMPT',
    'STATUS',
    'ACTOR_ACTION',
  ].includes(event.kind);
}

function actorName(state: BattleState, actorId: string | undefined): string {
  if (!actorId) return '他';
  return state.actors.find((actor) => actor.actorId === actorId)?.name ?? '他';
}

function buildZogLine(event: DisplayEvent, state: BattleState): string {
  switch (event.kind) {
    case 'ZOG':
      return event.content;
    case 'ELIMINATION':
      return `${actorName(state, event.targetId)} 被节目吃掉了。`;
    case 'DAMAGE':
      if (event.damage >= 30) return '这一下少了一块节目生命。';
      if (event.damage >= 20) return '电视里的痛会便宜点吗？';
      return '他刚才漏电了吗？';
    case 'HEAL':
      return event.healAmount >= 30 ? '急救预算居然是真的。' : '他又续上一口节目命。';
    case 'ITEM':
      return event.source === 'PLAYER' ? '冰箱预算不是我偷的。' : '演员也会翻冰箱？';
    case 'BROADCAST':
      return '你又对电视施法了。';
    case 'MUTATION':
      return '频道开始变味了。';
    case 'PROMPT':
      return '你在给演员贴新标签。';
    case 'STATUS':
      return event.added ? '他身上亮了个怪标签。' : '怪标签掉下来了。';
    case 'ACTOR_ACTION':
      if (/dodo|bird|鸟|渡渡/i.test(event.content)) return '鸟很多的时候，鸟就是天气。';
      return '这段节目有点皱。';
    default:
      return '我在看。别挡屏幕。';
  }
}

function buildIdleLine(state: BattleState): string {
  if (state.actorActionIndex <= 0) return '我坐好了。电视开打吧。';
  if (state.actors.filter((actor) => actor.isAlive).length <= 2) return '剩下的人闻起来很紧张。';
  if (state.scene.wildDodos < 30) return '野生渡渡鸟快被分完了。';
  return '我在看。别挡屏幕。';
}

function clampBubbleLine(line: string): string {
  const clean = line.replace(/\s+/g, ' ').trim();
  return clean.length > 34 ? `${clean.slice(0, 33)}…` : clean;
}
