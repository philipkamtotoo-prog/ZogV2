import { useMemo, useState, type CSSProperties } from 'react';
import { DEFAULT_ROSTER } from '../../actors/actorRoster';
import {
  ACTOR_GACHA_SINGLE_COST,
  ACTOR_GACHA_TEN_COST,
  ACTOR_SHARDS_TO_UNLOCK,
  useLoungeStore,
} from '../../lounge/loungeStore';
import type { ActorGachaResult } from '../actorGacha';

interface GachaPanelProps {
  onClose: () => void;
}

export function GachaPanel({ onClose }: GachaPanelProps) {
  const {
    gold,
    actorContractShards,
    unlockedActorIds,
    gachaPullCount,
    gachaShardPityCount,
    lastGachaResults,
    pullActorGacha,
    unlockActorByShards,
  } = useLoungeStore();
  const [toast, setToast] = useState<string | null>(null);

  const actorRows = useMemo(() => {
    return DEFAULT_ROSTER.map((actor) => {
      const unlocked = actor.defaultUnlocked || unlockedActorIds.includes(actor.actorId);
      const shards = actorContractShards[actor.actorId] ?? 0;
      return { actor, unlocked, shards, canUnlock: !unlocked && shards >= ACTOR_SHARDS_TO_UNLOCK };
    });
  }, [actorContractShards, unlockedActorIds]);

  const handlePull = (count: 1 | 10) => {
    const results = pullActorGacha(count);
    if (!results) {
      setToast('G 不够，合同盆栽拒绝吐纸。');
      return;
    }
    setToast(buildToast(results));
  };

  const handleUnlock = (actorId: string) => {
    const ok = unlockActorByShards(actorId);
    setToast(ok ? '碎片签约成功，新演员已解锁。' : '碎片不足，合同盆栽装作没听见。');
  };

  const results = lastGachaResults.length > 0 ? lastGachaResults : [];

  return (
    <div style={overlayStyle}>
      <section style={panelStyle}>
        <header style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Broker Plant</div>
            <h2 style={titleStyle}>经纪人扭蛋盆栽</h2>
          </div>
          <button onClick={onClose} style={closeButtonStyle} type="button">×</button>
        </header>

        <div style={summaryStyle}>
          <span>G：{gold.toLocaleString()}</span>
          <span>总抽数：{gachaPullCount}</span>
          <span>碎片保底：{Math.min(gachaShardPityCount, 49)}/50</span>
        </div>

        <div style={buttonRowStyle}>
          <button disabled={gold < ACTOR_GACHA_SINGLE_COST} onClick={() => handlePull(1)} style={pullButtonStyle} type="button">
            单抽 {ACTOR_GACHA_SINGLE_COST}G
          </button>
          <button disabled={gold < ACTOR_GACHA_TEN_COST} onClick={() => handlePull(10)} style={pullButtonStyle} type="button">
            十连 {ACTOR_GACHA_TEN_COST}G
          </button>
        </div>

        {toast && <div style={toastStyle}>{toast}</div>}

        <div style={contentGridStyle}>
          <section style={boxStyle}>
            <h3 style={sectionTitleStyle}>本次结果</h3>
            {results.length === 0 ? (
              <p style={mutedStyle}>还没抽。先测试闭环，动画以后再做。</p>
            ) : (
              <div style={resultListStyle}>
                {results.map((result) => (
                  <article key={result.resultId} style={resultCardStyle(result)}>
                    <strong>{result.title}</strong>
                    <span>{result.detail}</span>
                    {result.forcedBy && <em>{result.forcedBy === 'SHARD_PITY' ? '50 抽保底' : '十连保底'}</em>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section style={boxStyle}>
            <h3 style={sectionTitleStyle}>合同碎片</h3>
            <div style={shardListStyle}>
              {actorRows.map(({ actor, unlocked, shards, canUnlock }) => (
                <div key={actor.actorId} style={shardRowStyle}>
                  <div>
                    <strong>{actor.name}</strong>
                    <span>{unlocked ? '已解锁' : '未解锁'} · {shards}/{ACTOR_SHARDS_TO_UNLOCK}</span>
                  </div>
                  <button disabled={!canUnlock} onClick={() => handleUnlock(actor.actorId)} style={unlockButtonStyle(canUnlock)} type="button">
                    碎片签约
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function buildToast(results: ActorGachaResult[]): string {
  const premium = results.find((result) => result.kind === 'DIRECT_CONTRACT' || result.kind === 'ACTOR_SHARD' || result.isPremium);
  return premium?.toast ?? results[0]?.toast ?? '盆栽吐出了一张很普通的纸。';
}

function resultCardStyle(result: ActorGachaResult): CSSProperties {
  const border = result.kind === 'DIRECT_CONTRACT'
    ? 'rgba(255, 219, 112, 0.86)'
    : result.isPremium
      ? 'rgba(98, 220, 255, 0.7)'
      : 'rgba(255, 255, 255, 0.14)';
  return {
    padding: 10,
    border: `1px solid ${border}`,
    background: 'rgba(8, 10, 20, 0.72)',
    display: 'grid',
    gap: 4,
    minHeight: 72,
  };
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 120,
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  background: 'rgba(0, 0, 0, 0.62)',
};

const panelStyle: CSSProperties = {
  width: 'min(1020px, 96vw)',
  maxHeight: '92vh',
  overflow: 'auto',
  border: '1px solid rgba(139, 255, 214, 0.42)',
  background: 'rgba(15, 17, 31, 0.96)',
  color: '#f5f0dc',
  padding: 18,
  boxShadow: '0 20px 80px rgba(0, 0, 0, 0.55)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
};

const eyebrowStyle: CSSProperties = {
  color: '#8bffd6',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const titleStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 28,
};

const closeButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 24,
};

const summaryStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 14,
  color: '#cfe9ff',
  fontWeight: 700,
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 14,
};

const pullButtonStyle: CSSProperties = {
  padding: '10px 14px',
  border: '1px solid rgba(255, 219, 112, 0.52)',
  background: 'rgba(255, 193, 84, 0.13)',
  color: '#ffe1a6',
  cursor: 'pointer',
  fontWeight: 900,
};

const toastStyle: CSSProperties = {
  marginTop: 12,
  padding: '10px 12px',
  border: '1px solid rgba(139, 255, 214, 0.42)',
  background: 'rgba(20, 72, 58, 0.45)',
  color: '#baffea',
  fontWeight: 800,
};

const contentGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)',
  gap: 14,
  marginTop: 14,
};

const boxStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  padding: 12,
};

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 10px',
  fontSize: 16,
};

const mutedStyle: CSSProperties = {
  color: 'rgba(245,240,220,0.66)',
};

const resultListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 8,
};

const shardListStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const shardRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  alignItems: 'center',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  paddingBottom: 8,
};

function unlockButtonStyle(enabled: boolean): CSSProperties {
  return {
    padding: '7px 9px',
    border: '1px solid rgba(139, 255, 214, 0.42)',
    background: enabled ? 'rgba(43, 175, 132, 0.22)' : 'rgba(255,255,255,0.05)',
    color: enabled ? '#baffea' : 'rgba(255,255,255,0.38)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 800,
  };
}
