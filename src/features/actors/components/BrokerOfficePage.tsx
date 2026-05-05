import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { DEFAULT_ROSTER, type RosterActor } from '../actorRoster';
import { ACTOR_GIFT_TIERS, useLoungeStore } from '../../lounge/loungeStore';
import { BrokerPixiCanvas } from '../../shop/components/BrokerPixiCanvas';
import '../../shop/components/ShopPage.css';

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

const TITLE_ASSET = assetPath('\u0041\u006c\u0069\u006e\u0065\u7ecf\u6d4e\u4ee3\u7406.png');
const BACKGROUND_ASSET = assetPath('\u5e95\u677f.png');
const NAMEPLATE_ASSET = assetPath('\u5df2\u89e3\u9501\u94ed\u724c.png');
const AVATAR_ASSET = assetPath('\u5934\u50cf\u5360\u4f4d\u692d\u5706.png');
const PIXI_FRAME_ASSET = assetPath('\u6f14\u5458\u7acb\u7ed8\u6846\u8499.png');
const LAMP_ASSET = assetPath('\u706f\u6ce1.png');
const CUP_ASSET = assetPath('\u5496\u5561\u676f.png');

const APPEARANCE_OPTIONS: AppearanceOption[] = [
  { id: 'basic_skin', asset: assetPath('\u5916\u89c21.png'), cost: 60, left: 1557, top: 655, width: 64, height: 68 },
  { id: 'advanced_skin', asset: assetPath('\u5916\u89c22.png'), cost: 180, left: 1640, top: 657, width: 65, height: 66 },
  { id: 'skin_3', asset: assetPath('\u5916\u89c23.png'), left: 1724, top: 656, width: 66, height: 69 },
  { id: 'skin_4', asset: assetPath('\u5916\u89c24.png'), left: 1811, top: 654, width: 67, height: 69 },
  { id: 'skin_5', asset: assetPath('\u56fe\u5c42 2.png'), left: 1899, top: 654, width: 71, height: 69 },
];

const GIFT_ASSETS = new Map<number, string>([
  [100, assetPath('100G .png')],
  [350, assetPath('350G.png')],
  [800, assetPath('800G.png')],
]);

const AFFECTION_TIERS = [
  { tier: 1, min: 0, max: 100 },
  { tier: 2, min: 100, max: 300 },
  { tier: 3, min: 300, max: 700 },
  { tier: 4, min: 700, max: 1500 },
  { tier: 5, min: 1500, max: null },
] as const;

const STAT_VALUE_LAYOUT: { key: StatKey; left: number; top: number; width: number; height: number }[] = [
  { key: 'baseHP', left: 1750, top: 388, width: 86, height: 28 },
  { key: 'baseATK', left: 1750, top: 428, width: 86, height: 28 },
  { key: 'baseDEF', left: 1750, top: 467, width: 86, height: 28 },
  { key: 'baseSPD', left: 1750, top: 506, width: 86, height: 28 },
  { key: 'baseThreat', left: 1750, top: 541, width: 86, height: 28 },
];

export function BrokerOfficePage({ onBack }: BrokerOfficePageProps) {
  const {
    gold,
    unlockedActorIds,
    actorAffection,
    actorSalary,
    actorPurchases,
    giftActor,
    spendActorSalary,
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
  const stageScale = useFixedStageScale();
  const scaledWidth = STAGE_WIDTH * stageScale;
  const scaledHeight = STAGE_HEIGHT * stageScale;

  return (
    <div className="broker-page">
      <div className="broker-viewport">
        <div
          className="broker-stage"
          style={{
            transform: `scale(${stageScale})`,
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            marginLeft: `${(window.innerWidth - scaledWidth) / 2}px`,
            marginTop: `${(window.innerHeight - scaledHeight) / 2}px`,
          }}
        >
        <img alt="" className="broker-art" src={BACKGROUND_ASSET} />
        <img alt="" className="broker-art" src={TITLE_ASSET} style={absBox(239, 86, 381, 108)} />
        <img alt="" className="broker-art" src={PIXI_FRAME_ASSET} style={absBox(779.67, 133, 636, 841)} />
        <img alt="" className="broker-art" src={LAMP_ASSET} style={absBox(1389.67, -32, 102, 95)} />
        <img alt="" className="broker-art" src={CUP_ASSET} style={absBox(-31.33, 1029, 332, 323)} />

        <button className="broker-back-button" onClick={onBack} type="button" style={absBox(1898, 66, 132, 38)}>
          {'\u8fd4\u56de'}
        </button>

        <div className="broker-gold-display" style={absBox(1690, 110, 210, 48)}>
          <strong>{gold}</strong>
          <span>G</span>
        </div>

        <section className="broker-left-panel" style={absBox(157, 249, 522, 647)}>
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
                      <div className="broker-card-name">{actor.name}</div>
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

        <div className="broker-pixi-shell" style={absBox(779.67, 133, 636, 841)}>
          <BrokerPixiCanvas />
          <div className="broker-pixi-placeholder">{'Pixi \u6f14\u5458\u7acb\u7ed8\u9884\u7559\u5c42'}</div>
        </div>

        {selectedActor?.unlocked ? (
          <>
            {STAT_VALUE_LAYOUT.map((stat) => (
              <div className="broker-stat-floating" key={stat.key} style={absBox(stat.left, stat.top, stat.width, stat.height)}>
                {selectedActor[stat.key]}
              </div>
            ))}
            <div className="broker-salary-floating" style={absBox(1830, 458, 126, 36)}>
              {`S\uff1a${selectedActorSalary}`}
            </div>
          </>
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
        </div>
      </div>
    </div>
  );
}

function assetPath(fileName: string): string {
  return `/brokeroffice/${encodeURIComponent(fileName)}`;
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

function getAffinityProgress(affection: number): { tier: number; percent: number; display: string } {
  const safeAffection = Math.max(0, affection);
  const currentTier =
    AFFECTION_TIERS.find((tier) => tier.max === null || safeAffection < tier.max) ??
    AFFECTION_TIERS[AFFECTION_TIERS.length - 1];

  if (currentTier.max === null) {
    return { tier: currentTier.tier, percent: 100, display: '100/100' };
  }

  const span = currentTier.max - currentTier.min;
  const withinTier = Math.min(span, Math.max(0, safeAffection - currentTier.min));
  const percent = span === 0 ? 0 : Math.round((withinTier / span) * 100);

  return {
    tier: currentTier.tier,
    percent,
    display: `${Math.round(withinTier)}/100`,
  };
}

function useFixedStageScale(): number {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT));

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT));
    };

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return scale;
}
