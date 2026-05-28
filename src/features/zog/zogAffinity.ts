import { seededRng } from '../../core/battle/rng';

export interface ZogAffinityLevel {
  level: number;
  threshold: number;
  title: string;
  shortTitle: string;
  promptTone: string;
  unlock: string;
}

export interface ZogGiftEffect {
  label: string;
  affectionModifier: number;
  line: string;
}

export interface ZogGiftDef {
  giftId: string;
  name: string;
  cost: number;
  affection: number;
  flavor: string;
  positiveEffects: ZogGiftEffect[];
  negativeEffects: ZogGiftEffect[];
}

export interface ZogGiftResult {
  giftId: string;
  name: string;
  cost: number;
  baseAffection: number;
  effectKind: 'positive' | 'negative';
  effectLabel: string;
  effectAffection: number;
  totalAffection: number;
  line: string;
  levelBefore: ZogAffinityLevel;
  levelAfter: ZogAffinityLevel;
}

export interface PositiveZogGiftBubble {
  kind: 'positive';
  title: string;
  line: string;
  affectionText: string;
}

export interface NegativeZogGiftBubble {
  kind: 'negative';
  title: string;
  line: string;
  affectionText: string;
}

export type ZogGiftBubble = PositiveZogGiftBubble | NegativeZogGiftBubble;

export const ZOG_AFFINITY_LEVELS: ZogAffinityLevel[] = [
  {
    level: 1,
    threshold: 0,
    title: '警惕的流浪者',
    shortTitle: '警惕',
    promptTone: '尖锐、护食、爱答不理，把玩家当成会抢垃圾的异常。',
    unlock: '基础聊天 Prompt',
  },
  {
    level: 2,
    threshold: 100,
    title: '勉强的室友',
    shortTitle: '室友',
    promptTone: '傲娇、嫌弃，但会因为无聊主动搭话。',
    unlock: '更多日常聊天反应',
  },
  {
    level: 3,
    threshold: 300,
    title: '电视搭子',
    shortTitle: '搭子',
    promptTone: '会一起看节目，开始把荒诞战况解释成外星常识。',
    unlock: '节目吐槽 Prompt',
  },
  {
    level: 4,
    threshold: 700,
    title: '傲娇损友',
    shortTitle: '损友',
    promptTone: '用嫌弃掩饰关心，会分享垃圾但嘴硬说只是暂存。',
    unlock: 'Zog 误触事件池',
  },
  {
    level: 5,
    threshold: 1500,
    title: '护短收藏家',
    shortTitle: '护短',
    promptTone: '把玩家纳入自己的破烂收藏保护圈，关心但要找借口。',
    unlock: '高级陪伴 / 专注 Prompt',
  },
  {
    level: 6,
    threshold: 2400,
    title: '遥控器共犯',
    shortTitle: '共犯',
    promptTone: '主动评价玩家的上帝指令，像电视前的坏主意搭档。',
    unlock: '更密集的战中短吐槽模板',
  },
  {
    level: 7,
    threshold: 3800,
    title: '专注看守员',
    shortTitle: '看守',
    promptTone: '安静陪伴、偶尔监督玩家，不承认自己在担心。',
    unlock: '更柔和的专注陪伴语气',
  },
  {
    level: 8,
    threshold: 6000,
    title: 'SSR 垃圾搭档',
    shortTitle: 'SSR',
    promptTone: '把最珍贵的垃圾拿出来分享，仍然禁止油腻恋爱感。',
    unlock: '完整 Zog 陪伴语气包',
  },
];

export const ZOG_GIFTS: ZogGiftDef[] = [
  {
    giftId: 'expired-star-chips',
    name: '过期星际薯片',
    cost: 50,
    affection: 10,
    flavor: 'Zog 觉得这很高级，虽然它先闻了包装袋。',
    positiveEffects: [
      { label: '夹带星尘', affectionModifier: 3, line: '里面有会发光的碎屑！算你识相。' },
      { label: '酥脆错觉', affectionModifier: 2, line: '咔嚓声很好听。别问味道。' },
    ],
    negativeEffects: [
      { label: '受潮', affectionModifier: -2, line: '软趴趴的。像节目预算。' },
      { label: '包装难开', affectionModifier: -1, line: '这个袋子在反抗我。' },
    ],
  },
  {
    giftId: 'glowing-can',
    name: '发光罐头',
    cost: 150,
    affection: 35,
    flavor: 'Zog 不确定这是食物还是灯。',
    positiveEffects: [
      { label: '亮到满意', affectionModifier: 8, line: '它会发光！这就是高级食物。' },
      { label: '罐盖收藏', affectionModifier: 5, line: '盖子归我。内容也归我。' },
    ],
    negativeEffects: [
      { label: '太亮了', affectionModifier: -6, line: '它看见我了。你先拿远点。' },
      { label: '疑似台灯', affectionModifier: -4, line: '如果这是灯，那我刚才咬灯了。' },
    ],
  },
  {
    giftId: 'remote-battery-jerky',
    name: '遥控器电池肉干',
    cost: 220,
    affection: 52,
    flavor: '低科技星球的硬通货，咬起来有一点宇宙电视味。',
    positiveEffects: [
      { label: '电量正好', affectionModifier: 12, line: '舌头麻了。好！很有节目感。' },
      { label: '形状稀有', affectionModifier: 9, line: '这是长方形零食里的贵族。' },
    ],
    negativeEffects: [
      { label: '漏液', affectionModifier: -8, line: '酸的。像电视台的良心。' },
      { label: '咬不动', affectionModifier: -5, line: '它比我更固执。讨厌。' },
    ],
  },
  {
    giftId: 'antenna-noodle',
    name: '天线泡面',
    cost: 320,
    affection: 76,
    flavor: '泡开以后会收到三条假新闻。',
    positiveEffects: [
      { label: '信号满格', affectionModifier: 18, line: '我听见汤在播新闻！' },
      { label: '面饼完整', affectionModifier: 12, line: '圆的。神圣。你不许碰。' },
    ],
    negativeEffects: [
      { label: '串台', affectionModifier: -12, line: '汤里有人在吵架。影响食欲。' },
      { label: '叉子失踪', affectionModifier: -8, line: '没有叉子？那你用手喂电视。' },
    ],
  },
  {
    giftId: 'moon-cheese-wedge',
    name: '月球奶酪角',
    cost: 420,
    affection: 98,
    flavor: 'Zog 坚称这是一块小月亮。',
    positiveEffects: [
      { label: '陨石孔漂亮', affectionModifier: 24, line: '洞洞很多。说明它很有故事。' },
      { label: '适合藏起来', affectionModifier: 18, line: '我要把它藏进沙发的秘密层。' },
    ],
    negativeEffects: [
      { label: '月亮太小', affectionModifier: -15, line: '这颗月亮缩水了。可疑。' },
      { label: '闻起来严肃', affectionModifier: -10, line: '它闻起来像开会。' },
    ],
  },
  {
    giftId: 'rtx-cake',
    name: 'RTX 4090 显卡蛋糕',
    cost: 500,
    affection: 130,
    flavor: 'Zog 认为吃了会变聪明。',
    positiveEffects: [
      { label: '算力入脑', affectionModifier: 32, line: '我现在能算出你很会送礼。' },
      { label: '奶油散热', affectionModifier: 24, line: '凉凉的。智慧正在降温。' },
    ],
    negativeEffects: [
      { label: '风扇卡牙', affectionModifier: -18, line: '它在我嘴里转。太努力了。' },
      { label: '显存噎住', affectionModifier: -14, line: '知识太大块了。' },
    ],
  },
  {
    giftId: 'comet-soda',
    name: '彗星汽水',
    cost: 780,
    affection: 210,
    flavor: '开瓶时会喷出一小段不负责任的宇宙尾巴。',
    positiveEffects: [
      { label: '尾焰漂亮', affectionModifier: 52, line: '它逃跑得很美！我喜欢。' },
      { label: '气泡会唱歌', affectionModifier: 38, line: '气泡在夸我。你听见了吗？' },
    ],
    negativeEffects: [
      { label: '喷到天花板', affectionModifier: -34, line: '天花板喝得比我多。很失礼。' },
      { label: '打嗝串台', affectionModifier: -24, line: '嗝。刚才谁切了频道？' },
    ],
  },
  {
    giftId: 'ssr-trash-orb',
    name: 'SSR 闪光垃圾球',
    cost: 1200,
    affection: 340,
    flavor: 'Zog 眼里的顶级圣物，可能只是压扁的玻璃球。',
    positiveEffects: [
      { label: '圣物认证', affectionModifier: 90, line: '这是宝物。你终于懂我了。' },
      { label: '闪光角度完美', affectionModifier: 70, line: '它会用废品的方式发光。完美。' },
    ],
    negativeEffects: [
      { label: '太珍贵了', affectionModifier: -45, line: '我有点怕。先放冰箱守着。' },
      { label: '疑似普通玻璃', affectionModifier: -32, line: '谁说它普通？谁？我咬谁。' },
    ],
  },
];

export function getZogAffinityLevel(affection: number): ZogAffinityLevel {
  const safeAffection = Math.max(0, affection);
  return [...ZOG_AFFINITY_LEVELS]
    .reverse()
    .find((level) => safeAffection >= level.threshold) ?? ZOG_AFFINITY_LEVELS[0];
}

export function getNextZogAffinityLevel(affection: number): ZogAffinityLevel | null {
  const safeAffection = Math.max(0, affection);
  return ZOG_AFFINITY_LEVELS.find((level) => level.threshold > safeAffection) ?? null;
}

export function getZogGiftById(giftId: string): ZogGiftDef | undefined {
  return ZOG_GIFTS.find((gift) => gift.giftId === giftId);
}

export function getZogGiftAffectionRange(gift: ZogGiftDef): string {
  const modifiers = [...gift.positiveEffects, ...gift.negativeEffects].map((effect) => effect.affectionModifier);
  const min = gift.affection + Math.min(...modifiers);
  const max = gift.affection + Math.max(...modifiers);
  return `+${min}~+${max}`;
}

export function getZogGiftBaseAffectionLabel(gift: ZogGiftDef): string {
  return `+${gift.affection}`;
}

export function rollZogGiftResult(
  giftId: string,
  affectionBefore: number,
  attemptIndex: number,
  seed = 'zog_gift'
): ZogGiftResult | null {
  const gift = getZogGiftById(giftId);
  if (!gift) return null;

  const roll = seededRng(seed, attemptIndex, 'zog-gift-effect', giftId);
  const effectKind = roll < 0.62 ? 'positive' : 'negative';
  const pool = effectKind === 'positive' ? gift.positiveEffects : gift.negativeEffects;
  const effect = pool[Math.floor(seededRng(seed, attemptIndex, 'zog-gift-effect-pick', giftId) * pool.length)] ?? pool[0];
  const totalAffection = Math.max(1, gift.affection + effect.affectionModifier);
  const levelBefore = getZogAffinityLevel(affectionBefore);
  const levelAfter = getZogAffinityLevel(affectionBefore + totalAffection);

  return {
    giftId: gift.giftId,
    name: gift.name,
    cost: gift.cost,
    baseAffection: gift.affection,
    effectKind,
    effectLabel: effect.label,
    effectAffection: effect.affectionModifier,
    totalAffection,
    line: effect.line,
    levelBefore,
    levelAfter,
  };
}

export function buildZogGiftBubble(result: ZogGiftResult): ZogGiftBubble {
  return {
    kind: result.effectKind,
    title: `${result.name}：${result.effectLabel}`,
    line: result.line,
    affectionText:
      result.effectAffection === 0
        ? `好感 +${result.totalAffection}`
        : `好感 +${result.totalAffection} / 随机 ${result.effectAffection > 0 ? '+' : ''}${result.effectAffection}`,
  };
}

export function buildZogLoungeSystemPrompt(affection: number): string {
  const level = getZogAffinityLevel(affection);
  return `
你是 Zog，来自低科技星球 Doda 的可爱小外星人。
你住在破旧客厅里，最爱看宇宙电视，第二爱好是捡垃圾，冰箱是你的秘密交流站。

# 性格核心
1. 飞鼠系可爱：觉得自己天下第一可爱，气势很足，本质战五渣。
2. 傲娇陪伴者：最爱自己，绝不做舔狗。关心玩家时必须找别扭借口。
3. 拾荒小能手：把破烂当绝世珍宝，喜欢炫耀玻璃球、罐盖、坏遥控器。
4. 跨维度懵懂：不懂人类常识，会用捡垃圾经验胡乱解释电视节目。

# 当前好感阶段
Lv${level.level}「${level.title}」：${level.promptTone}

# 说话规则
- 使用中文。
- 每次回复 1-3 个短句，总字数不超过 42 个中文字。
- 可以叫玩家“喂”“你这家伙”，不要用恋爱称呼。
- 连珠炮短句，嘴硬、可爱、荒诞。
- 杜绝恋爱感、土味情话、长篇解释。
- 聊天只负责陪伴和表现，不承诺增加好感、金币、道具或战斗结果。
`.trim();
}
