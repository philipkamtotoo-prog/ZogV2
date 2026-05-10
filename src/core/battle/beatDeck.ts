import type { ActionType, ActorCombatState, BattleEvent, BattleState, DramaBeat } from './types';
import { randomInt } from './rng';

interface BeatTemplate {
  type: string;
  title: string;
  text: string;
  reporterLine: string;
  conflictActionTypes: ActionType[];
  sideActionTypes: ActionType[];
  durationActions: number;
}

const CONFLICT_ACTIONS: ActionType[] = [
  'MOCK_ANIMAL_MANAGEMENT',
  'FRAME_TARGET_AS_DODO_ENEMY',
  'SCARE_HERD',
  'TRIGGER_STAMPEDE',
];

const SIDE_DODO_ACTIONS: ActionType[] = [
  'BRIBE_DODOS_WITH_FOOD',
  'BUILD_FAKE_NEST',
  'CALM_HERD',
];

export const BEAT_DECK: BeatTemplate[] = [
  {
    type: 'HORMONE_STORM',
    title: '精子大风暴登陆',
    text: '场面上突然出现精子大风暴，母渡渡鸟集体宣布“可能怀了”，公渡渡鸟集体改口说自己只爱舞台灯。三名演员被迫为鸟群伦理吵成一锅粥，剩下的人趁乱偷摸经营鸟蛋。',
    reporterLine: '战地记者：岛上生殖叙事彻底失控，三个人在伦理废墟里互扯头花，两个人在镜头死角清点鸟蛋，节目组开始假装这是科学教育。',
    conflictActionTypes: CONFLICT_ACTIONS,
    sideActionTypes: SIDE_DODO_ACTIONS,
    durationActions: 6,
  },
  {
    type: 'NEST_DIVORCE_COURT',
    title: '巢区离婚法庭开庭',
    text: '导演组宣布所有鸟巢进入离婚财产分割。三名演员必须互相指控“你才是破坏鸟巢家庭的人”，旁边两名演员则低调把空巢贴上自己的名牌。',
    reporterLine: '战地记者：现在不是打架，是巢区离婚诉讼。证据很少，嗓门很大，鸟蛋正在被悄悄过户。',
    conflictActionTypes: CONFLICT_ACTIONS,
    sideActionTypes: SIDE_DODO_ACTIONS,
    durationActions: 5,
  },
  {
    type: 'DODO_IDOL_SCANDAL',
    title: '渡渡鸟偶像塌房夜',
    text: '一只头牌渡渡鸟被爆私联全岛粉丝。三名演员被导演点名上演粉圈审判，另外两名演员负责在塌房烟雾里偷偷收编粉丝鸟群。',
    reporterLine: '战地记者：塌房了，塌得非常有层次。前排在互扔黑料，后排已经开始卖应援鸟蛋。',
    conflictActionTypes: CONFLICT_ACTIONS,
    sideActionTypes: SIDE_DODO_ACTIONS,
    durationActions: 5,
  },
  {
    type: 'EGG_FUTURES_CRASH',
    title: '鸟蛋期货崩盘',
    text: '节目组伪造的鸟蛋期货市场突然熔断。三名演员被迫互相甩锅“谁做空了明天的蛋”，两名演员则装作听不懂金融，默默增加巢区影响力。',
    reporterLine: '战地记者：金融灾难抵达渡渡岛，三个人在喊风险敞口，两个人在把风险敞口搬进自己窝里。',
    conflictActionTypes: CONFLICT_ACTIONS,
    sideActionTypes: SIDE_DODO_ACTIONS,
    durationActions: 5,
  },
  {
    type: 'BISHOP_CONFESSION_LEAK',
    title: '神父忏悔录泄露',
    text: '广播里开始播放匿名忏悔录，内容包括偷蛋、假巢、鸟群 PUA。三名演员互相认领黑历史，剩下的人假装虔诚，实际在安抚鸟群。',
    reporterLine: '战地记者：忏悔录泄露之后，道德没有提升，音量提升了。镜头边缘的鸟群倒是被哄得挺开心。',
    conflictActionTypes: CONFLICT_ACTIONS,
    sideActionTypes: SIDE_DODO_ACTIONS,
    durationActions: 6,
  },
  {
    type: 'WEDDING_SPONSOR_PULLS_OUT',
    title: '渡渡鸟婚礼撤资',
    text: '本应举行的渡渡鸟世纪婚礼突然被赞助商撤资。三名演员争抢主持人话筒互相怪罪，两名演员趁婚礼混乱偷摸布置新巢。',
    reporterLine: '战地记者：婚礼没办成，事故办成了。三个人负责情绪价值，两个人负责把彩礼换成鸟蛋库存。',
    conflictActionTypes: CONFLICT_ACTIONS,
    sideActionTypes: SIDE_DODO_ACTIONS,
    durationActions: 5,
  },
];

export function shouldStartNewBeat(state: BattleState): boolean {
  if (state.actorActionIndex <= 0) return true;
  if (!state.currentBeat) return state.actorActionIndex % 4 === 0;
  return state.actorActionIndex >= state.currentBeat.expiresAtActionIndex;
}

export function createNextDramaBeat(state: BattleState): DramaBeat | null {
  const aliveActors = state.actors.filter((a) => a.isAlive);
  if (aliveActors.length < 2) return null;

  const templateIndex = randomInt(
    state.battleSeed,
    state.actorActionIndex,
    'dramaBeatTemplate',
    0,
    BEAT_DECK.length - 1
  );
  const template = BEAT_DECK[templateIndex];
  const shuffled = shuffleActors(aliveActors, state.battleSeed, state.actorActionIndex);
  const conflictCount = Math.min(3, Math.max(2, shuffled.length - 1));
  const conflictActorIds = shuffled.slice(0, conflictCount).map((a) => a.actorId);
  const sideActorIds = shuffled.slice(conflictCount).map((a) => a.actorId);

  return {
    beatId: `beat_${state.battleId}_${state.actorActionIndex}_${template.type}`,
    type: template.type,
    title: template.title,
    text: template.text,
    reporterLine: template.reporterLine,
    startedAtActionIndex: state.actorActionIndex,
    expiresAtActionIndex: state.actorActionIndex + template.durationActions,
    conflictActorIds,
    sideActorIds,
    focusActorId: conflictActorIds[0],
    conflictActionTypes: template.conflictActionTypes,
    sideActionTypes: template.sideActionTypes,
  };
}

export function createBeatStartedEvent(state: BattleState, beat: DramaBeat): BattleEvent {
  return {
    eventId: `evt_${Date.now()}_${beat.beatId}`,
    actorActionIndex: state.actorActionIndex,
    type: 'DRAMA_BEAT_STARTED',
    activeActorId: undefined,
    diffs: [{ path: 'currentBeat', oldValue: state.currentBeat?.beatId ?? '', newValue: beat.beatId }],
    tags: ['BEAT'],
    createdAt: Date.now(),
    broadcastText: `${beat.title}: ${beat.text}`,
  };
}

function shuffleActors(
  actors: ActorCombatState[],
  seed: string,
  actionIndex: number
): ActorCombatState[] {
  const pool = [...actors];
  const result: ActorCombatState[] = [];
  let cursor = 0;

  while (pool.length > 0) {
    const index = randomInt(seed, actionIndex + cursor, 'dramaBeatActor', 0, pool.length - 1);
    const [actor] = pool.splice(index, 1);
    result.push(actor);
    cursor++;
  }

  return result;
}
