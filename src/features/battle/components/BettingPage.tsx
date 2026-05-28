import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ActorCombatState, ProgramMutation, ProgramMutationId } from '../../../core/battle/types';
import { DEFAULT_ROSTER } from '../../actors/actorRoster';
import { useLoungeStore } from '../../lounge/loungeStore';
import { calculateOdds, MAX_BET_AMOUNT, MIN_BET_AMOUNT } from '../../../core/economy/betting';
import { getAllItems, type ItemDef } from '../../../core/economy/items';
import { MUTATION_LIQUID_COST } from '../../../core/battle/programMutations';
import { CurrencyAmount } from '../../../shared/game-ui';
import { useBattleStore } from '../battleStore';
import './BettingPage.css';

const STAGE_WIDTH = 1624;
const STAGE_HEIGHT = 1050;
const BET_AMOUNTS = [50, 100, 250, 500] as const;
const PROMPT_INJECTION_COST_PER_CHAR = 100;
const PROMPT_INJECTION_COST_CAP = 1000;
const AFFECTION_TIERS = [
  { tier: 1, min: 0, max: 150 },
  { tier: 2, min: 150, max: 500 },
  { tier: 3, min: 500, max: 1200 },
  { tier: 4, min: 1200, max: 3000 },
  { tier: 5, min: 3000, max: null },
] as const;

const asset = (folder: string, file: string) => `/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;

const PRE_BATTLE_ASSETS = {
  background: asset('战前', '手绘.png'),
  antennaLeft: asset('战前', '天线左.png'),
  antennaRight: asset('战前', '天线右.png'),
  close: asset('战前', '退出按钮.png'),
  title: asset('战前', '开播准备.png'),
  titleIcon: asset('战前', '开播准备前的图标.png'),
  gold: asset('道具icon', 'G币icon.png'),
  battleItemIcon: asset('商店浮层', '战斗补寄icon.png'),
  promptIcon: asset('战前', '加戏icon.png'),
  decoCircleTop: asset('战前', '圆形 左上.png'),
  decoCircleTopAlt: asset('战前', '圆形 左上-2.png'),
  decoCircleBottom: asset('战前', '圆形 左下.png'),
  decoCircleBottomAlt: asset('战前', '圆形 左下-2.png'),
};

const LAYOUT = {
  background: box(0, 83, 1624, 967),
  antennaLeft: box(761, 26, 51, 77),
  antennaRight: box(838, 26, 53, 77),
  titleIcon: box(122, 169, 75, 65),
  title: box(213, 169, 299, 70),
  gold: box(1122, 169, 263, 64),
  close: box(1427, 162, 85, 83),
  actorGrid: box(126, 353, 920, 374),
  info: box(1114, 306, 398, 394),
  prompt: box(122, 762, 394, 126),
  items: box(564, 762, 394, 126),
  reroll: box(1006, 762, 218, 126),
  mutation: box(1272, 762, 218, 126),
  footer: box(122, 936, 1390, 50),
} as const;

const ROSTER_META = new Map(DEFAULT_ROSTER.map((actor) => [actor.actorId, actor]));

const PRE_BATTLE_DECORATIONS = [
  { className: 'is-top-left', src: PRE_BATTLE_ASSETS.decoCircleTop, style: box(-4, 230, 90, 90) },
  { className: 'is-top-left-alt', src: PRE_BATTLE_ASSETS.decoCircleTopAlt, style: box(1538, 230, 90, 90) },
  { className: 'is-bottom-left', src: PRE_BATTLE_ASSETS.decoCircleBottom, style: box(-4, 765, 90, 90) },
  { className: 'is-bottom-left-alt', src: PRE_BATTLE_ASSETS.decoCircleBottomAlt, style: box(1538, 765, 90, 90) },
] as const;

const ACTOR_TAGS: Record<string, { label: string; tone: 'olive' | 'blue' | 'gray' | 'green' }[]> = {
  tdog: [
    { label: '易丧', tone: 'olive' },
    { label: '嘴硬', tone: 'gray' },
  ],
  cybercat: [
    { label: '速度快', tone: 'blue' },
    { label: '高攻击', tone: 'green' },
  ],
  nanobot: [
    { label: '害羞', tone: 'gray' },
    { label: '防御强', tone: 'olive' },
  ],
  dodo_bishop: [
    { label: '神叨叨', tone: 'olive' },
    { label: '血量厚', tone: 'green' },
  ],
  glitch_witch: [
    { label: '高风险', tone: 'blue' },
    { label: '爆发强', tone: 'olive' },
  ],
  astro_toad: [
    { label: '慢热', tone: 'gray' },
    { label: '自信怪', tone: 'green' },
  ],
  sofa_mimic: [
    { label: '隐忍', tone: 'green' },
    { label: '难处理', tone: 'gray' },
  ],
  neon_crab: [
    { label: '宇宙人气', tone: 'green' },
    { label: '平衡型', tone: 'blue' },
  ],
  blob_accountant: [
    { label: '精打细算', tone: 'gray' },
    { label: '低调记仇', tone: 'olive' },
  ],
  tian_yake: [
    { label: '冷面', tone: 'blue' },
    { label: '吸睛怪', tone: 'green' },
  ],
};

const ACTOR_TITLE_CN: Record<string, string> = {
  tdog: '犬系冷笑话哲学家',
  cybercat: '高速赛博猫',
  nanobot: '害羞防御小机器',
  dodo_bishop: '可疑鸟群主教',
  glitch_witch: '高危故障女巫',
  astro_toad: '慢热宇宙蟾蜍',
  sofa_mimic: '家具形状幸存者',
  neon_crab: '发光平衡螃蟹',
  blob_accountant: '胶质宇宙会计',
  tian_yake: '可疑帅气游荡者',
};

const MUTATION_COPY: Record<ProgramMutationId, { name: string; description: string }> = {
  STUTTER_CUT: { name: '卡顿剪辑', description: '演员台词会明显卡顿。数值不变，节目效果变怪。' },
  LOW_BUDGET_RAIN: { name: '廉价暴雨', description: '现场广播加入低成本暴雨设定。数值不变。' },
  FAKE_NEST_FEVER: { name: '假巢热潮', description: '建造假巢获得额外 +5 巢区影响力。' },
  DODO_ALERT: { name: '渡渡鸟警报', description: '所有演员开局渡渡鸟信任 -3。' },
  NEST_PRIME_TIME: { name: '黄金巢区档', description: '宣称巢区时额外获得 +4 巢区影响力。' },
  LEAKY_MIC: { name: '漏音麦克风', description: '演员会按麦克风漏音设定表演。数值不变。' },
};

export function BettingPage() {
  const {
    actorPromptInjections,
    battleState,
    betSlip,
    buyMutationLiquid,
    confirmBet,
    goToLobby,
    mutationCandidates,
    placeBet,
    rerollActors,
    selectMutation,
    selectedMutation,
    setActorPromptInjection,
    startBattle,
  } = useBattleStore();
  const gold = useLoungeStore((state) => state.gold);
  const addGold = useLoungeStore((state) => state.addGold);
  const actorAffection = useLoungeStore((state) => state.actorAffection);
  const inventory = useLoungeStore((state) => state.inventory);
  const spendGold = useLoungeStore((state) => state.spendGold);
  const preBattleScale = usePreBattleScale();
  const actors = battleState?.actors ?? [];
  const [selectedActorId, setSelectedActorId] = useState<string | null>(actors[0]?.actorId ?? null);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [promptText, setPromptText] = useState('');
  const [isMutationDrawerOpen, setIsMutationDrawerOpen] = useState(false);
  const [pendingMutationId, setPendingMutationId] = useState<ProgramMutationId | null>(null);

  useEffect(() => {
    if (actors.length === 0) return;
    if (!selectedActorId || !actors.some((actor) => actor.actorId === selectedActorId)) {
      setSelectedActorId(actors[0].actorId);
    }
  }, [actors, selectedActorId]);

  const selectedActor = actors.find((actor) => actor.actorId === selectedActorId) ?? actors[0] ?? null;
  const selectedInjection = selectedActor
    ? actorPromptInjections.find((injection) => injection.actorId === selectedActor.actorId)
    : undefined;
  const cleanPromptText = promptText.trim();
  const savedPromptText = selectedInjection?.source === 'EPISODE' ? selectedInjection.prompt : '';
  const promptHasChanged = cleanPromptText !== savedPromptText;
  const promptCharacterCount = Array.from(cleanPromptText).length;
  const promptCost = promptHasChanged
    ? Math.min(promptCharacterCount * PROMPT_INJECTION_COST_PER_CHAR, PROMPT_INJECTION_COST_CAP)
    : 0;
  const canSavePrompt = Boolean(selectedActor && promptCost <= gold);
  const battleItems = useMemo(() => getAllItems().filter((item) => item.usableInBattle).slice(0, 4), []);
  const canReroll = gold >= 200 && !betSlip;
  const canBet = Boolean(
    selectedActor &&
    !betSlip &&
    betAmount >= MIN_BET_AMOUNT &&
    betAmount <= MAX_BET_AMOUNT &&
    betAmount <= gold
  );
  const startDisabled = Boolean(selectedActor && !betSlip && betAmount > gold);
  const canConfirmMutation = Boolean(pendingMutationId && gold >= MUTATION_LIQUID_COST && !selectedMutation);

  useEffect(() => {
    setPromptText(selectedInjection?.source === 'EPISODE' ? selectedInjection.prompt : '');
  }, [selectedActor?.actorId, selectedInjection?.prompt, selectedInjection?.source]);

  useEffect(() => {
    if (!isMutationDrawerOpen || pendingMutationId || mutationCandidates.length === 0) return;
    setPendingMutationId(mutationCandidates[0].mutationId);
  }, [isMutationDrawerOpen, mutationCandidates, pendingMutationId]);

  const handleSelectActor = (actorId: string) => {
    setSelectedActorId(actorId);
  };

  const handleSavePrompt = () => {
    if (!selectedActor || !canSavePrompt) return;
    if (promptCost > 0 && !spendGold(promptCost)) return;
    setActorPromptInjection(selectedActor.actorId, promptText);
  };

  const handleStart = (withBet: boolean) => {
    setIsMutationDrawerOpen(false);

    if (withBet && selectedActor && canBet) {
      placeBet(selectedActor.actorId, betAmount);
      useBattleStore.getState().confirmBet();
    } else if (betSlip && !betSlip.locked) {
      confirmBet();
    }

    startBattle();
  };

  const handleClose = () => {
    if (selectedMutation) {
      addGold(MUTATION_LIQUID_COST);
    }
    goToLobby();
  };

  const handleMutationButtonClick = () => {
    if (selectedMutation) return;
    if (mutationCandidates.length === 0) {
      buyMutationLiquid();
    }
    setIsMutationDrawerOpen((current) => !current);
  };

  const handleConfirmMutation = () => {
    if (!pendingMutationId || selectedMutation || gold < MUTATION_LIQUID_COST) return;
    selectMutation(pendingMutationId);
    setIsMutationDrawerOpen(false);
  };

  if (!battleState) {
    return (
      <div className="prebattle-overlay">
        <div className="prebattle-loading">正在调试开播信号...</div>
      </div>
    );
  }

  return (
    <div className="prebattle-overlay" role="dialog" aria-modal="true" aria-label="战前开播准备">
      <div
        className="prebattle-modal"
        style={{ width: STAGE_WIDTH * preBattleScale, height: STAGE_HEIGHT * preBattleScale }}
      >
        <div
          className="prebattle-stage"
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest('.prebattle-mutation-area')) return;
            setIsMutationDrawerOpen(false);
          }}
          style={{ transform: `scale(${preBattleScale})` }}
        >
          <img className="prebattle-bg" alt="" src={PRE_BATTLE_ASSETS.background} draggable={false} style={LAYOUT.background} />
          <img className="prebattle-antenna is-left" alt="" src={PRE_BATTLE_ASSETS.antennaLeft} draggable={false} style={LAYOUT.antennaLeft} />
          <img className="prebattle-antenna is-right" alt="" src={PRE_BATTLE_ASSETS.antennaRight} draggable={false} style={LAYOUT.antennaRight} />
          <img className="prebattle-title-icon" alt="" src={PRE_BATTLE_ASSETS.titleIcon} draggable={false} style={LAYOUT.titleIcon} />
          <img className="prebattle-title" alt="开播准备" src={PRE_BATTLE_ASSETS.title} draggable={false} style={LAYOUT.title} />
          {PRE_BATTLE_DECORATIONS.map((deco) => (
            <img
              alt=""
              className={`prebattle-deco ${deco.className}`}
              draggable={false}
              key={deco.className}
              src={deco.src}
              style={deco.style}
            />
          ))}

          <div className="prebattle-gold" style={LAYOUT.gold}>
            <img alt="" src={PRE_BATTLE_ASSETS.gold} draggable={false} />
            <strong>{gold.toLocaleString('en-US')}</strong>
          </div>
          <button className="prebattle-close" onClick={handleClose} style={LAYOUT.close} type="button" aria-label="退出开播准备">
            <img alt="" src={PRE_BATTLE_ASSETS.close} draggable={false} />
          </button>

          <section className="prebattle-actor-grid" style={LAYOUT.actorGrid}>
            {actors.map((actor) => (
              <ActorCard
                actor={actor}
                actors={actors}
                injected={actorPromptInjections.some((injection) => injection.actorId === actor.actorId)}
                key={actor.actorId}
                onSelect={handleSelectActor}
                selected={actor.actorId === selectedActor?.actorId}
              />
            ))}
          </section>

          <ActorInfoPanel
            actor={selectedActor}
            affectionTotal={selectedActor ? actorAffection[selectedActor.actorId] ?? ROSTER_META.get(selectedActor.actorId)?.affection ?? 0 : 0}
            actors={actors}
            betAmount={betAmount}
            betSlipActorName={betSlip ? actors.find((actor) => actor.actorId === betSlip.actorId)?.name : undefined}
            style={LAYOUT.info}
          />

          <section className="prebattle-panel is-prompt" style={LAYOUT.prompt}>
            <div className="prebattle-title-row">
              <div className="prebattle-title-with-icon">
                <img className="prebattle-prompt-title-icon" alt="" src={PRE_BATTLE_ASSETS.promptIcon} draggable={false} />
                <div className="prebattle-panel-title">为他加戏</div>
              </div>
              <small className={promptCost > gold ? 'is-danger' : undefined}>
                {promptCost > 0 ? <CurrencyAmount value={promptCost} variant="gold" /> : '0G'}
                <span>100G/字 最高1000G</span>
              </small>
            </div>
            <textarea
              maxLength={60}
              onChange={(event) => setPromptText(event.target.value)}
              placeholder="本期限定..."
              value={promptText}
            />
            <button className="prebattle-mini-button" disabled={!canSavePrompt} onClick={handleSavePrompt} type="button">
              {promptCost > gold ? '金币不足' : '保存'}
            </button>
          </section>

          <section className="prebattle-panel is-items" style={LAYOUT.items}>
            <div className="prebattle-title-row is-items">
              <img className="prebattle-item-title-icon" alt="" src={PRE_BATTLE_ASSETS.battleItemIcon} draggable={false} />
              <div className="prebattle-panel-title">战斗可用道具</div>
            </div>
            <div className="prebattle-item-list">
              {battleItems.map((item) => (
                <div className="prebattle-item-chip" key={item.itemId}>
                  <img alt="" src={asset('道具icon', item.iconFile)} draggable={false} />
                  <span className="prebattle-item-count">x{inventory[item.itemId] ?? 0}</span>
                  <ItemHoverCard count={inventory[item.itemId] ?? 0} item={item} />
                </div>
              ))}
            </div>
          </section>

          <button className="prebattle-big-action" disabled={!canReroll} onClick={rerollActors} style={LAYOUT.reroll} type="button">
            <span>重选演员</span>
            <strong><CurrencyAmount value={200} variant="gold" /></strong>
          </button>

          <div className="prebattle-mutation-area" style={LAYOUT.mutation}>
            <button
              className={`prebattle-big-action${selectedMutation ? ' is-confirmed' : ''}`}
              disabled={Boolean(selectedMutation)}
              onClick={handleMutationButtonClick}
              type="button"
            >
              <span>{selectedMutation ? '已注入变异' : '注入变异'}</span>
              <strong>{selectedMutation ? getMutationCopy(selectedMutation).name : <CurrencyAmount value={MUTATION_LIQUID_COST} variant="gold" />}</strong>
            </button>
            {isMutationDrawerOpen && !selectedMutation ? (
              <MutationDrawer
                canConfirm={canConfirmMutation}
                candidates={mutationCandidates}
                onConfirm={handleConfirmMutation}
                onPick={setPendingMutationId}
                pendingMutationId={pendingMutationId}
              />
            ) : null}
          </div>

          <footer className="prebattle-footer" style={LAYOUT.footer}>
            <button className="prebattle-skip" onClick={() => handleStart(false)} type="button">
              Skip bet / Start
            </button>
            <div className="prebattle-bet-controls" aria-label="支持金额">
              <span>支持他</span>
              {BET_AMOUNTS.map((amount) => (
                <button
                  className={betAmount === amount ? 'is-selected' : ''}
                  disabled={Boolean(betSlip)}
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  type="button"
                >
                  <CurrencyAmount value={amount} variant="gold" />
                </button>
              ))}
            </div>
            <button className="prebattle-start" disabled={startDisabled || !canBet} onClick={() => handleStart(true)} type="button">
              开始比赛
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ActorCard({
  actor,
  actors,
  injected,
  onSelect,
  selected,
}: {
  actor: ActorCombatState;
  actors: ActorCombatState[];
  injected: boolean;
  onSelect: (actorId: string) => void;
  selected: boolean;
}) {
  const odds = calculateOdds(actor, actors);

  return (
    <button
      className={`prebattle-actor-card${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(actor.actorId)}
      type="button"
    >
      <span className="prebattle-odds">x{odds.toFixed(1)}</span>
      <ActorMascot actorId={actor.actorId} />
      <strong>{actor.name}</strong>
      {injected ? <small>已加戏</small> : null}
    </button>
  );
}

function ActorMascot({ actorId }: { actorId: string }) {
  return (
    <span className={`prebattle-mascot is-${actorId}`} aria-hidden="true">
      <i className="part hat" />
      <i className="part ear left" />
      <i className="part ear right" />
      <i className="part head" />
      <i className="part eye left" />
      <i className="part eye right" />
      <i className="part body" />
    </span>
  );
}

function ActorInfoPanel({
  actor,
  affectionTotal,
  actors,
  betAmount,
  betSlipActorName,
  style,
}: {
  actor: ActorCombatState | null;
  affectionTotal: number;
  actors: ActorCombatState[];
  betAmount: number;
  betSlipActorName?: string;
  style: CSSProperties;
}) {
  if (!actor) {
    return <section className="prebattle-info" style={style} />;
  }

  const roster = ROSTER_META.get(actor.actorId);
  const odds = calculateOdds(actor, actors);
  const tags = ACTOR_TAGS[actor.actorId] ?? [];
  const affectionProgress = getAffinityProgress(affectionTotal);

  return (
    <section className="prebattle-info" style={style}>
      <div className="prebattle-actor-profile">
        <div className="prebattle-avatar-placeholder" aria-hidden="true" />
        <div className="prebattle-actor-profile-copy">
          <h3>{actor.name}</h3>
          <p>{ACTOR_TITLE_CN[actor.actorId] ?? roster?.title ?? '本期临场演员'}</p>
          <div className="prebattle-actor-tags">
            {tags.map((tag) => (
              <span className={`prebattle-actor-tag is-${tag.tone}`} key={`${actor.actorId}-${tag.label}`}>
                {tag.label}
              </span>
            ))}
          </div>
          <div className="prebattle-affection">
            <span>{`LV${affectionProgress.tier}`}</span>
            <div className="prebattle-affection-progress">
              <div className="prebattle-affection-fill" style={{ width: `${affectionProgress.percent}%` }} />
              <strong>{affectionProgress.display}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="prebattle-stat-sheet">
        <StatLine label="节目耐摔度 (HP)" value={actor.maxHP} />
        <StatLine label="嘴拳能力 (ATK)" value={actor.ATK} />
        <StatLine label="抗羞辱能力 (DEF)" value={actor.DEF} />
        <StatLine label="抢镜速度 (SPD)" value={actor.SPD} />
        <StatLine label="惹人恨指数 (THREAT)" value={actor.baseThreat} />
      </div>
      <div className="prebattle-support-summary">
        <span>赔率 x{odds.toFixed(1)}</span>
        {betSlipActorName ? (
          <strong className="prebattle-supported-name">{`已支持 ${betSlipActorName}`}</strong>
        ) : (
          <div className="prebattle-ready-support">
            <b>准备支持</b>
            <em><CurrencyAmount value={betAmount} variant="gold" /></em>
          </div>
        )}
      </div>
    </section>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="prebattle-stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ItemHoverCard({ count, item }: { count: number; item: ItemDef }) {
  return (
    <div className="prebattle-item-tooltip" role="tooltip">
      <h4>{item.name}</h4>
      <div className="prebattle-item-tooltip-grid">
        <strong>效果</strong>
        <span>{item.effectLabel}</span>
        <strong>副作用</strong>
        <span>{item.sideEffectLabel}</span>
      </div>
      <p>{item.description}</p>
      <small>
        库存 x{count} / 价格 <CurrencyAmount value={item.cost} variant="gold" />
      </small>
    </div>
  );
}

export function MutationPicker({
  candidates,
  onSelect,
  selectedMutation,
}: {
  candidates: ProgramMutation[];
  onSelect: (mutationId: ProgramMutation['mutationId']) => void;
  selectedMutation: ProgramMutation | null;
}) {
  if (selectedMutation) {
    return (
      <div className="prebattle-mutation-picked">
        <span>已注入变异</span>
        <strong>{getMutationCopy(selectedMutation).name}</strong>
      </div>
    );
  }

  if (candidates.length === 0) {
    return <div className="prebattle-mutation-empty">未注入变异液</div>;
  }

  return (
    <div className="prebattle-mutation-list">
      {candidates.map((mutation) => (
        <button key={mutation.mutationId} onClick={() => onSelect(mutation.mutationId)} type="button">
          <strong>{getMutationCopy(mutation).name}</strong>
          <span>{getMutationCopy(mutation).description}</span>
        </button>
      ))}
    </div>
  );
}

function MutationDrawer({
  canConfirm,
  candidates,
  onConfirm,
  onPick,
  pendingMutationId,
}: {
  canConfirm: boolean;
  candidates: ProgramMutation[];
  onConfirm: () => void;
  onPick: (mutationId: ProgramMutationId) => void;
  pendingMutationId: ProgramMutationId | null;
}) {
  return (
    <div className="prebattle-mutation-drawer">
      <div className="prebattle-mutation-drawer-title">选择变异液</div>
      <div className="prebattle-mutation-drawer-list">
        {candidates.map((mutation) => {
          const copy = getMutationCopy(mutation);
          return (
            <button
              className={pendingMutationId === mutation.mutationId ? 'is-selected' : ''}
              key={mutation.mutationId}
              onClick={() => onPick(mutation.mutationId)}
              type="button"
            >
              <strong>{copy.name}</strong>
              <span>{copy.description}</span>
            </button>
          );
        })}
      </div>
      <button className="prebattle-mutation-confirm" disabled={!canConfirm} onClick={onConfirm} type="button">
        确认注入 <CurrencyAmount value={MUTATION_LIQUID_COST} variant="gold" />
      </button>
    </div>
  );
}

function getMutationCopy(mutation: ProgramMutation): { name: string; description: string } {
  return MUTATION_COPY[mutation.mutationId] ?? { name: mutation.name, description: mutation.description };
}

function getAffinityProgress(affection: number): { tier: number; percent: number; display: string } {
  const safeAffection = Math.max(0, affection);
  const currentTier =
    AFFECTION_TIERS.find((tier) => tier.max === null || safeAffection < tier.max) ??
    AFFECTION_TIERS[AFFECTION_TIERS.length - 1];

  if (currentTier.max === null) {
    return { tier: currentTier.tier, percent: 100, display: 'MAX' };
  }

  const span = currentTier.max - currentTier.min;
  const withinTier = Math.min(span, Math.max(0, safeAffection - currentTier.min));
  const percent = span === 0 ? 0 : Math.round((withinTier / span) * 100);

  return {
    tier: currentTier.tier,
    percent,
    display: `${safeAffection}/${currentTier.max}`,
  };
}

function box(left: number, top: number, width: number, height: number): CSSProperties {
  return { left, top, width, height };
}

function usePreBattleScale(): number {
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return 0.72;
    return getPreBattleScale(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const update = () => setScale(getPreBattleScale(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}

function getPreBattleScale(viewportWidth: number, viewportHeight: number): number {
  return Math.min(1, (viewportWidth * 0.8) / STAGE_WIDTH, (viewportHeight * 0.9) / STAGE_HEIGHT);
}
