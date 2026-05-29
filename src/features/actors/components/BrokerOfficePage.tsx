import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { DEFAULT_ROSTER, type RosterActor } from '../actorRoster';
import {
  ACTOR_GIFT_TIERS,
  ACTOR_POTENTIAL_TRAIN_SHARD_COST,
  ACTOR_SHARDS_TO_UNLOCK,
  useLoungeStore,
} from '../../lounge/loungeStore';
import { ACTOR_POTENTIAL_MAX_POINTS, createEmptyActorPotential } from '../actorPotential';
import { CurrencyDisplay, FixedStage, assetPath as gameAssetPath } from '../../../shared/game-ui';
import { BrokerPixiCanvas } from './BrokerPixiCanvas';
import { hasActorArt } from '../renderer/actorArtRegistry';
import { LampGlow } from './LampGlow';
import './BrokerOfficePage.css';

interface BrokerOfficePageProps {
  onBack: () => void;
}

interface BrokerActorEntry extends RosterActor {
  unlocked: boolean;
  affectionTotal: number;
  rosterIndex: number;
}

interface AppearanceOption {
  id: string;
  asset: string;
  cost?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

type StatKey = 'baseHP' | 'baseATK' | 'baseDEF' | 'baseSPD' | 'baseThreat';
const STAGE_WIDTH = 2162;
const STAGE_HEIGHT = 1216;
const SOURCE_STAGE_OFFSET_X = 672;

const brokerAssetPath = (fileName: string) => gameAssetPath('brokerOffice', fileName);
const TITLE_ASSET = brokerAssetPath('\u0041\u006c\u0069\u006e\u0065\u7ecf\u6d4e\u4ee3\u7406.png');
const BACKGROUND_ASSET = brokerAssetPath('\u5e95\u677f.png');
const NAMEPLATE_ASSET = brokerAssetPath('\u5df2\u89e3\u9501\u94ed\u724c.png');
const AVATAR_ASSET = brokerAssetPath('\u5934\u50cf\u5360\u4f4d\u692d\u5706.png');
const PIXI_FRAME_ASSET = brokerAssetPath('\u6f14\u5458\u7acb\u7ed8\u6846\u8499.png');
const CUP_ASSET = brokerAssetPath('\u5496\u5561\u676f.png');
const BROKEROFFICE_EXIT_ASSET = brokerAssetPath('brokesofficeexit.png');

const APPEARANCE_OPTIONS: AppearanceOption[] = [
  { id: 'basic_skin', asset: brokerAssetPath('\u5916\u89c21.png'), cost: 60, left: 1557, top: 655, width: 64, height: 68 },
  { id: 'advanced_skin', asset: brokerAssetPath('\u5916\u89c22.png'), cost: 180, left: 1640, top: 657, width: 65, height: 66 },
  { id: 'skin_3', asset: brokerAssetPath('\u5916\u89c23.png'), left: 1724, top: 656, width: 66, height: 69 },
  { id: 'skin_4', asset: brokerAssetPath('\u5916\u89c24.png'), left: 1811, top: 654, width: 67, height: 69 },
  { id: 'skin_5', asset: brokerAssetPath('\u56fe\u5c42 2.png'), left: 1899, top: 654, width: 71, height: 69 },
];

const GIFT_ASSETS = new Map<number, string>([
  [100, brokerAssetPath('100G .png')],
  [350, brokerAssetPath('350G.png')],
  [800, brokerAssetPath('800G.png')],
]);

const ACTOR_TAGS: Record<string, { label: string; tone: 'olive' | 'blue' | 'gray' | 'green' }[]> = {
  tdog: [
    { label: '易怒', tone: 'olive' },
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

const AFFECTION_TIERS = [
  { tier: 1, min: 0, max: 150 },
  { tier: 2, min: 150, max: 500 },
  { tier: 3, min: 500, max: 1200 },
  { tier: 4, min: 1200, max: 3000 },
  { tier: 5, min: 3000, max: null },
] as const;

const STAT_VALUE_LAYOUT: { key: StatKey; left: number; top: number; width: number; height: number }[] = [
  { key: 'baseHP', left: 1750, top: 388, width: 86, height: 28 },
  { key: 'baseATK', left: 1750, top: 428, width: 86, height: 28 },
  { key: 'baseDEF', left: 1750, top: 467, width: 86, height: 28 },
  { key: 'baseSPD', left: 1750, top: 506, width: 86, height: 28 },
  { key: 'baseThreat', left: 1750, top: 541, width: 86, height: 28 },
];
const S_BALANCE_LAYOUT = { left: 1690, top: 606, width: 258, height: 32 };
const GOLD_BALANCE_LAYOUT = { left: 1690, top: 736, width: 258, height: 32 };

// IMPORTANT: Broker actor Pixi portrait slot.
// This box is the only React-owned position/size for the broker actor portrait canvas.
// Adjust left/top/width/height here when the portrait layer needs to move inside the broker office art.
// Actor-specific anchor, scale, and bottom-center placement live in actorArtRegistry.ts, not in this page.
const BROKER_ACTOR_PIXI_SLOT = { left: 779.67, top: 133, width: 636, height: 841 };

export function BrokerOfficePage({ onBack }: BrokerOfficePageProps) {
  const {
    gold,
    unlockedActorIds,
    actorAffection,
    actorSalary,
    actorPurchases,
    actorContractShards,
    actorPotential,
    giftActor,
    spendActorSalary,
    unlockActorByShards,
    trainActorPotential,
  } = useLoungeStore();

  const actors = useMemo<BrokerActorEntry[]>(() => {
    return DEFAULT_ROSTER
      .map((actor, rosterIndex) => ({
        ...actor,
        unlocked: actor.defaultUnlocked || unlockedActorIds.includes(actor.actorId),
        affectionTotal: actorAffection[actor.actorId] ?? actor.affection ?? 0,
        rosterIndex,
      }))
      .sort((left, right) => {
        if (left.unlocked !== right.unlocked) {
          return left.unlocked ? -1 : 1;
        }

        if (left.unlocked && right.unlocked && right.affectionTotal !== left.affectionTotal) {
          return right.affectionTotal - left.affectionTotal;
        }

        return left.rosterIndex - right.rosterIndex;
      });
  }, [actorAffection, unlockedActorIds]);

  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [actorActionRequestId, setActorActionRequestId] = useState(0);

  useEffect(() => {
    if (actors.length === 0) {
      setSelectedActorId(null);
      return;
    }

    const selectionStillExists = selectedActorId
      ? actors.some((actor) => actor.actorId === selectedActorId)
      : false;

    if (!selectionStillExists) {
      setSelectedActorId(actors[0]?.actorId ?? null);
    }
  }, [actors, selectedActorId]);

  const selectedActor = actors.find((actor) => actor.actorId === selectedActorId) ?? actors[0] ?? null;
  const selectedActorSalary = selectedActor ? actorSalary[selectedActor.actorId] ?? 0 : 0;
  const selectedActorPurchases = selectedActor ? actorPurchases[selectedActor.actorId] ?? [] : [];
  const selectedActorShards = selectedActor ? actorContractShards[selectedActor.actorId] ?? 0 : 0;
  const selectedActorPotential = selectedActor
    ? actorPotential[selectedActor.actorId] ?? createEmptyActorPotential()
    : createEmptyActorPotential();
  const canUnlockSelectedByShards = Boolean(
    selectedActor && !selectedActor.unlocked && selectedActorShards >= ACTOR_SHARDS_TO_UNLOCK,
  );
  const canTrainSelectedPotential = Boolean(
    selectedActor?.unlocked && selectedActorShards >= ACTOR_POTENTIAL_TRAIN_SHARD_COST,
  );
  const selectedActorHasArt = hasActorArt(selectedActor?.actorId);
  const [isPotentialPanelOpen, setIsPotentialPanelOpen] = useState(false);
  const [potentialMessage, setPotentialMessage] = useState<string | null>(null);

  const requestActorAction = () => {
    setActorActionRequestId((current) => current + 1);
  };

  const handleBrokerPageClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const isControlClick = Boolean(
      target.closest('.broker-list-card, .broker-exit-button, .broker-appearance-button, .broker-gift-button, .broker-shard-button, .broker-potential-button, .broker-potential-panel'),
    );
    if (isControlClick) return;

    requestActorAction();
  };

  return (
    <div className="broker-page" onClick={handleBrokerPageClick}>
      <FixedStage className="broker-stage" fit="cover" height={STAGE_HEIGHT} viewportClassName="broker-viewport" width={STAGE_WIDTH}>
        <img alt="" className="broker-art" src={BACKGROUND_ASSET} />
        <img alt="" className="broker-art" src={TITLE_ASSET} style={absBox(239, 81, 381, 108)} />
        <img alt="" className="broker-art" src={PIXI_FRAME_ASSET} style={absBox(BROKER_ACTOR_PIXI_SLOT.left, BROKER_ACTOR_PIXI_SLOT.top, BROKER_ACTOR_PIXI_SLOT.width, BROKER_ACTOR_PIXI_SLOT.height)} />
        <LampGlow />
        <img alt="" className="broker-art" src={CUP_ASSET} style={absBox(-31.33, 1029, 332, 323)} />

        <button className="broker-exit-button" onClick={onBack} style={sourceCenteredBox(2720, 65, 140, 140)} type="button">
          <img alt="" className="broker-exit-button-art" src={BROKEROFFICE_EXIT_ASSET} />
        </button>

        <CurrencyDisplay
          className="broker-balance-floating"
          label="G币余额："
          style={absBox(GOLD_BALANCE_LAYOUT.left, GOLD_BALANCE_LAYOUT.top, GOLD_BALANCE_LAYOUT.width, GOLD_BALANCE_LAYOUT.height)}
          value={gold}
          variant="gold"
        />

        <section className="broker-left-panel" style={absBox(157, 249, 522, 690)}>
          <div className="broker-list-scroll">
            {actors.map((actor) => {
              const isSelected = actor.actorId === selectedActor?.actorId;
              const progress = getAffinityProgress(actor.affectionTotal);

              return (
                <button
                  className={['broker-list-card', isSelected ? 'is-selected' : '', actor.unlocked ? '' : 'is-locked'].join(' ').trim()}
                  key={actor.actorId}
                  onClick={() => setSelectedActorId(actor.actorId)}
                  type="button"
                >
                  <img alt="" className="broker-list-card-art" src={NAMEPLATE_ASSET} />
                  <div className="broker-list-card-body">
                    <img alt="" className="broker-avatar" src={AVATAR_ASSET} />
                    <div className="broker-card-text">
                      <div className="broker-card-header">
                        <div className="broker-card-name">{actor.name}</div>
                        <div className="broker-card-tags">
                          {(ACTOR_TAGS[actor.actorId] ?? []).map((tag) => (
                            <span className={`broker-card-tag is-${tag.tone}`} key={`${actor.actorId}-${tag.label}`}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      {actor.unlocked ? (
                        <div className="broker-card-meta">
                          <span className="broker-card-level">{`LV${progress.tier}`}</span>
                          <div className="broker-progress">
                            <div className="broker-progress-fill" style={{ width: `${progress.percent}%` }} />
                            <span className="broker-progress-text">{progress.display}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="broker-pixi-shell" style={absBox(BROKER_ACTOR_PIXI_SLOT.left, BROKER_ACTOR_PIXI_SLOT.top, BROKER_ACTOR_PIXI_SLOT.width, BROKER_ACTOR_PIXI_SLOT.height)}>
          <BrokerPixiCanvas
            actionRequestId={actorActionRequestId}
            actorId={selectedActor?.actorId}
          />
          {!selectedActorHasArt ? <div className="broker-pixi-placeholder">{'Pixi \u6f14\u5458\u7acb\u7ed8\u9884\u7559\u5c42'}</div> : null}
        </div>

        {selectedActor?.unlocked ? (
          <>
            {STAT_VALUE_LAYOUT.map((stat) => (
              <div className="broker-stat-floating" key={stat.key} style={absBox(stat.left, stat.top, stat.width, stat.height)}>
                {selectedActor[stat.key]}
              </div>
            ))}
            <CurrencyDisplay
              className="broker-balance-floating"
              label="S币余额："
              style={absBox(S_BALANCE_LAYOUT.left, S_BALANCE_LAYOUT.top, S_BALANCE_LAYOUT.width, S_BALANCE_LAYOUT.height)}
              value={selectedActorSalary}
              variant="scoin"
            />
          </>
        ) : null}

        {selectedActor ? (
          <button
            className="broker-potential-button"
            onClick={() => {
              setPotentialMessage(null);
              setIsPotentialPanelOpen(true);
            }}
            style={{
              ...absBox(1740, 314, 210, 66),
              zIndex: 12,
              border: '1px solid rgba(83, 45, 24, 0.32)',
              background: 'rgba(255, 232, 173, 0.52)',
              color: '#2d2115',
              cursor: 'pointer',
              fontWeight: 900,
              textAlign: 'left',
              padding: '7px 10px',
            }}
            type="button"
          >
            <div>合同碎片 {selectedActorShards}/{ACTOR_SHARDS_TO_UNLOCK}</div>
            <div style={{ fontSize: 12 }}>潜能 {selectedActorPotential.totalPotentialPoints}/{ACTOR_POTENTIAL_MAX_POINTS}</div>
          </button>
        ) : null}

        {selectedActor && isPotentialPanelOpen ? (
          <section className="broker-potential-panel" style={potentialPanelStyle}>
            <button
              onClick={() => setIsPotentialPanelOpen(false)}
              style={potentialCloseStyle}
              type="button"
            >
              ×
            </button>
            <h2 style={{ margin: '0 0 8px' }}>{selectedActor.name} 养成</h2>
            <p style={{ margin: '0 0 10px', color: '#4f3c28' }}>
              合同碎片 {selectedActorShards}/{ACTOR_SHARDS_TO_UNLOCK} · 训练消耗 {ACTOR_POTENTIAL_TRAIN_SHARD_COST} 碎片
            </p>
            <div style={potentialGridStyle}>
              <span>HP +{selectedActorPotential.hpBonus}</span>
              <span>ATK +{selectedActorPotential.atkBonus}</span>
              <span>DEF +{selectedActorPotential.defBonus}</span>
              <span>SPD +{selectedActorPotential.spdBonus}</span>
              <span>THREAT -{selectedActorPotential.threatReduction}</span>
              <span>总潜能 {selectedActorPotential.totalPotentialPoints}/{ACTOR_POTENTIAL_MAX_POINTS}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="broker-shard-button"
                disabled={!canUnlockSelectedByShards}
                onClick={() => {
                  const ok = unlockActorByShards(selectedActor.actorId);
                  setPotentialMessage(ok ? '碎片签约成功。' : '碎片不足或演员已解锁。');
                }}
                style={potentialActionStyle(canUnlockSelectedByShards)}
                type="button"
              >
                碎片签约
              </button>
              <button
                className="broker-potential-button"
                disabled={!canTrainSelectedPotential}
                onClick={() => {
                  const result = trainActorPotential(selectedActor.actorId);
                  setPotentialMessage(result?.toast ?? '训练失败：需要已解锁演员和足够碎片。');
                }}
                style={potentialActionStyle(canTrainSelectedPotential)}
                type="button"
              >
                潜能训练
              </button>
            </div>
            {potentialMessage ? <p style={{ margin: '10px 0 0', fontWeight: 900 }}>{potentialMessage}</p> : null}
          </section>
        ) : null}

        {APPEARANCE_OPTIONS.map((appearance) => {
          const owned = selectedActorPurchases.includes(appearance.id);
          const enabled = Boolean(
            selectedActor?.unlocked &&
              !owned &&
              appearance.cost &&
              selectedActorSalary >= appearance.cost,
          );

          return (
            <button
              className={['broker-appearance-button', owned ? 'is-owned' : ''].join(' ').trim()}
              disabled={!enabled}
              key={appearance.id}
              onClick={() => {
                if (!selectedActor || !appearance.cost) {
                  return;
                }

                spendActorSalary(selectedActor.actorId, appearance.cost, appearance.id);
              }}
              style={absBox(appearance.left, appearance.top, appearance.width, appearance.height)}
              type="button"
            >
              <img alt="" src={appearance.asset} />
              {owned ? <span className="broker-owned-badge">{'\u5df2\u8d2d'}</span> : null}
            </button>
          );
        })}

        <section className="broker-gift-buttons" style={absBox(1540, 760, 445, 154)}>
          {ACTOR_GIFT_TIERS.map((gift) => {
            const affordable = Boolean(selectedActor?.unlocked && gold >= gift.cost);
            const giftAsset = GIFT_ASSETS.get(gift.cost);

            return (
              <button
                className={['broker-gift-button', affordable ? 'is-affordable' : ''].join(' ').trim()}
                disabled={!affordable}
                key={gift.cost}
                onClick={() => selectedActor && giftActor(selectedActor.actorId, gift.cost, gift.affection)}
                type="button"
              >
                <img alt={`${gift.cost}G`} src={giftAsset ?? ''} />
              </button>
            );
          })}
        </section>

        <section className="broker-marquee" style={absBox(630, 1013, 910, 60)}>
          <div className="broker-marquee-track">
            <MarqueeContent />
            <MarqueeContent />
          </div>
        </section>
      </FixedStage>
    </div>
  );
}

function MarqueeContent() {
  return (
    <div className="broker-marquee-content">
      <span>All Sales are</span>
      <span className="broker-marquee-space" aria-hidden="true">{' '}</span>
      <span className="is-accent">Final</span>
      <span>.</span>
      <span className="broker-marquee-space" aria-hidden="true">{' '}</span>
      <span>{'\u6240\u6709\u6d88\u8d39'}</span>
      <span className="is-accent">{'\u6982\u4e0d\u9000\u6b3e'}</span>
      <span>.</span>
      <span className="broker-marquee-space" aria-hidden="true">{' '}</span>
      <span>{'\u52a0\u5165\u7c89\u4e1d\u540e\u63f4\u4f1a'}</span>
      <span className="is-accent">{'\u79c1\u8054'}</span>
      <span>{'\u6f14\u5458. Join the Fan Club for'}</span>
      <span className="broker-marquee-space" aria-hidden="true">{' '}</span>
      <span className="is-accent">Private Access</span>
      <span className="broker-marquee-space" aria-hidden="true">{' '}</span>
      <span>to Actors.</span>
    </div>
  );
}

function absBox(left: number, top: number, width: number, height: number): CSSProperties {
  return {
    position: 'absolute',
    left,
    top,
    width,
    height,
  };
}

function sourceCenteredBox(centerX: number, centerY: number, width: number, height: number): CSSProperties {
  return absBox(centerX - SOURCE_STAGE_OFFSET_X - width / 2, centerY - height / 2, width, height);
}

const potentialPanelStyle: CSSProperties = {
  position: 'absolute',
  left: 1380,
  top: 260,
  width: 560,
  minHeight: 300,
  zIndex: 80,
  padding: 22,
  border: '2px solid rgba(75, 47, 25, 0.52)',
  background: 'rgba(246, 222, 168, 0.96)',
  color: '#2d2115',
  boxShadow: '0 18px 60px rgba(0, 0, 0, 0.38)',
};

const potentialCloseStyle: CSSProperties = {
  position: 'absolute',
  right: 10,
  top: 8,
  width: 34,
  height: 34,
  border: '1px solid rgba(75, 47, 25, 0.35)',
  background: 'rgba(255,255,255,0.36)',
  cursor: 'pointer',
  fontSize: 22,
  fontWeight: 900,
};

const potentialGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  padding: 12,
  border: '1px dashed rgba(75, 47, 25, 0.36)',
  background: 'rgba(255,255,255,0.28)',
  fontWeight: 800,
};

function potentialActionStyle(enabled: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    border: '1px solid rgba(69, 48, 31, 0.38)',
    background: enabled ? '#8bd461' : 'rgba(255,255,255,0.42)',
    color: enabled ? '#172412' : 'rgba(45, 33, 21, 0.52)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 900,
  };
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

