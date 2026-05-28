import { DEFAULT_ROSTER, type RosterActor } from '../actorRoster';
import { useLoungeStore, ACTOR_GIFT_TIERS } from '../../lounge/loungeStore';
import { useState } from 'react';
import { CurrencyAmount, CurrencyDisplay } from '../../../shared/game-ui';

interface RosterPageProps {
  onBack: () => void;
}

const SALARY_PURCHASES = [
  { id: 'basic_skin', label: '初级外观', cost: 60 },
  { id: 'advanced_skin', label: '高级外观', cost: 180 },
];

const TIER_NAMES = ['', '路人', '铁粉', '金主', '带资进组', '通信对象'];

export function RosterPage({ onBack }: RosterPageProps) {
  const {
    unlockedActorIds,
    gold,
    zogAffection,
    actorAffection,
    actorSalary,
    actorPurchases,
    actorPermanentPrompts,
    unlockActor,
    giftActor,
    spendActorSalary,
    getActorAffinityTier,
    setPermanentPrompt,
    modifyPermanentPrompt,
    clearPermanentPrompt,
  } = useLoungeStore();

  const isUnlocked = (a: RosterActor) => a.defaultUnlocked || unlockedActorIds.includes(a.actorId);

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ color: '#ffeb3b', margin: 0 }}>演员花名册</h2>
          <CurrencyDisplay label="金币:" value={gold} variant="gold" style={{ color: '#888', fontSize: 12, fontWeight: 900 }} />
        </div>
        <button onClick={onBack} style={backBtnStyle}>返回</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEFAULT_ROSTER.map((actor) => {
          const unlocked = isUnlocked(actor);
          const canUnlock = !unlocked && gold >= actor.unlockCost && zogAffection >= actor.unlockAffection;
          const aff = actorAffection[actor.actorId] ?? 0;
          const tier = getActorAffinityTier(actor.actorId);
          const salary = actorSalary[actor.actorId] ?? 0;
          const purchases = actorPurchases[actor.actorId] ?? [];
          const permanentPrompt = actorPermanentPrompts[actor.actorId];

          return (
            <div key={actor.actorId} style={cardStyle(unlocked)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <span style={{ color: '#eee', fontWeight: 'bold' }}>{unlocked ? actor.name : '???'}</span>
                <span style={{ color: '#888', fontSize: 11 }}>{unlocked ? actor.title : '未解锁'}</span>
              </div>

              {unlocked ? (
                <>
                  <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>{actor.bio}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#aaa', flexWrap: 'wrap', marginBottom: 8 }}>
                    <span>HP: {actor.baseHP}</span>
                    <span>ATK: {actor.baseATK}</span>
                    <span>DEF: {actor.baseDEF}</span>
                    <span>SPD: {actor.baseSPD}</span>
                    <span>THREAT: {actor.baseThreat}</span>
                    <span>好感: {aff} (Lv{tier} {TIER_NAMES[tier]})</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      片酬: <CurrencyAmount value={salary} variant="scoin" />
                    </span>
                  </div>

                  <div style={buttonRowStyle}>
                    {ACTOR_GIFT_TIERS.map((gift) => (
                      <button
                        key={gift.cost}
                        onClick={() => giftActor(actor.actorId, gift.cost, gift.affection)}
                        disabled={gold < gift.cost}
                        style={smallButtonStyle(gold >= gift.cost)}
                      >
                        送礼物 <CurrencyAmount value={gift.cost} variant="gold" /> +{gift.affection}
                      </button>
                    ))}
                  </div>

                  <div style={buttonRowStyle}>
                    {SALARY_PURCHASES.map((purchase) => {
                      const owned = purchases.includes(purchase.id);
                      const canBuy = !owned && salary >= purchase.cost;
                      return (
                        <button
                          key={purchase.id}
                          onClick={() => spendActorSalary(actor.actorId, purchase.cost, purchase.id)}
                          disabled={!canBuy}
                          style={smallButtonStyle(canBuy)}
                        >
                          {owned ? '已拥有' : <>{purchase.label} <CurrencyAmount value={purchase.cost} variant="scoin" /></>}
                        </button>
                      );
                    })}
                  </div>

                  {tier >= 4 && (
                    <PermanentPromptSection
                      actorName={actor.name}
                      prompt={permanentPrompt}
                      gold={gold}
                      salary={salary}
                      onSet={(p) => setPermanentPrompt(actor.actorId, p)}
                      onModify={(p) => modifyPermanentPrompt(actor.actorId, p)}
                      onClear={() => clearPermanentPrompt(actor.actorId)}
                    />
                  )}
                  {tier < 4 && (
                    <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
                      好感 Lv4（带资进组）解锁永久注入
                    </div>
                  )}
                </>
              ) : (
                <div style={{ marginTop: 4 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>
                    解锁: <CurrencyAmount value={actor.unlockCost} variant="gold" /> + Zog好感 {actor.unlockAffection}
                  </div>
                  <button onClick={() => unlockActor(actor.actorId)} disabled={!canUnlock} style={smallButtonStyle(canUnlock)}>
                    解锁
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PermanentPromptSection({ actorName, prompt, gold, salary, onSet, onModify, onClear }: {
  actorName: string; prompt?: string; gold: number; salary: number;
  onSet: (p: string) => void; onModify: (p: string) => void; onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(prompt ?? '');

  return (
    <div style={{ marginTop: 8, padding: 8, background: '#0a0a1a', borderRadius: 6 }}>
      <div style={{ color: '#f48fb1', fontSize: 12, marginBottom: 4 }}>永久注入 {actorName}</div>
      {prompt ? (
        <>
          <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>"{prompt}"</div>
          {editing ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input value={text} onChange={(e) => setText(e.target.value.slice(0, 30))} maxLength={30}
                style={{ flex: 1, background: '#1a1a2e', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '2px 6px', fontSize: 11 }} />
              <button onClick={() => { onModify(text); setEditing(false); }} style={smallButtonStyle(gold >= 1500 && salary >= 200)}>保存 <CurrencyAmount value={1500} variant="gold" />+<CurrencyAmount value={200} variant="scoin" /></button>
              <button onClick={() => setEditing(false)} style={smallButtonStyle(true)}>取消</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setEditing(true)} style={smallButtonStyle(gold >= 1500 && salary >= 200)}>修改 <CurrencyAmount value={1500} variant="gold" />+<CurrencyAmount value={200} variant="scoin" /></button>
              <button onClick={onClear} style={smallButtonStyle(gold >= 1000)}>清除 <CurrencyAmount value={1000} variant="gold" /></button>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ color: '#555', fontSize: 11, marginBottom: 4 }}>未设置（30字上限）</div>
          {editing ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input value={text} onChange={(e) => setText(e.target.value.slice(0, 30))} maxLength={30}
                style={{ flex: 1, background: '#1a1a2e', color: '#eee', border: '1px solid #555', borderRadius: 4, padding: '2px 6px', fontSize: 11 }} />
              <button onClick={() => { onSet(text); setEditing(false); }} style={smallButtonStyle(gold >= 1000 && salary >= 200)}>写入 <CurrencyAmount value={1000} variant="gold" />+<CurrencyAmount value={200} variant="scoin" /></button>
              <button onClick={() => setEditing(false)} style={smallButtonStyle(true)}>取消</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={smallButtonStyle(gold >= 1000 && salary >= 200)}>写入永久注入 <CurrencyAmount value={1000} variant="gold" />+<CurrencyAmount value={200} variant="scoin" /></button>
          )}
        </>
      )}
    </div>
  );
}

function cardStyle(unlocked: boolean): React.CSSProperties {
  return {
    padding: 12,
    background: unlocked ? '#1a1a2e' : '#1a1a1a',
    borderRadius: 8,
    border: `1px solid ${unlocked ? '#333' : '#222'}`,
    opacity: unlocked ? 1 : 0.7,
  };
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginTop: 6,
};

function smallButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '4px 10px',
    borderRadius: 4,
    border: 'none',
    background: enabled ? '#ff9800' : '#333',
    color: enabled ? '#fff' : '#666',
    fontSize: 11,
    cursor: enabled ? 'pointer' : 'default',
  };
}

const backBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 4,
  border: 'none',
  background: '#333',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 12,
};
