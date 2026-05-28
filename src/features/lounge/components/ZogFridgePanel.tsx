import { useMemo, useState, type FormEvent } from 'react';
import { useLoungeStore } from '../loungeStore';
import { CurrencyDisplay, assetPath } from '../../../shared/game-ui';
import {
  ZOG_GIFTS,
  buildZogGiftBubble,
  getZogGiftAffectionRange,
  getNextZogAffinityLevel,
  getZogAffinityLevel,
  type ZogGiftBubble,
} from '../../zog/zogAffinity';

interface ZogFridgePanelProps {
  onClose: () => void;
}

const ZOG_HEAD_SRC = assetPath('hub', 'zog.png');

export function ZogFridgePanel({ onClose }: ZogFridgePanelProps) {
  const gold = useLoungeStore((s) => s.gold);
  const zogAffection = useLoungeStore((s) => s.zogAffection);
  const zogGiftInventory = useLoungeStore((s) => s.zogGiftInventory);
  const giftZogById = useLoungeStore((s) => s.giftZogById);
  const lastZogGiftResult = useLoungeStore((s) => s.lastZogGiftResult);
  const chatMessages = useLoungeStore((s) => s.chatMessages);
  const sendChat = useLoungeStore((s) => s.sendChat);
  const clearChat = useLoungeStore((s) => s.clearChat);
  const isZogTyping = useLoungeStore((s) => s.isZogTyping);
  const [draft, setDraft] = useState('');

  const level = getZogAffinityLevel(zogAffection);
  const nextLevel = getNextZogAffinityLevel(zogAffection);
  const progress = useMemo(() => {
    if (!nextLevel) return 100;
    const span = nextLevel.threshold - level.threshold;
    return Math.max(0, Math.min(100, ((zogAffection - level.threshold) / span) * 100));
  }, [level.threshold, nextLevel, zogAffection]);
  const giftBubble = lastZogGiftResult ? buildZogGiftBubble(lastZogGiftResult) : null;

  const submitChat = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isZogTyping) return;
    setDraft('');
    void sendChat(text);
  };

  return (
    <div style={overlayStyle}>
      <section style={panelStyle} aria-label="Zog 冰箱交流">
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>FRIDGE LINK / ZOG</div>
            <h2 style={titleStyle}>冰箱旁边的 Zog</h2>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>关闭</button>
        </div>

        <div style={bodyStyle}>
          <section style={statusStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={labelStyle}>好感阶段</div>
                <strong style={levelStyle}>Lv{level.level} {level.title}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={labelStyle}>金币</div>
                <CurrencyDisplay label="" style={goldStyle} value={gold} variant="gold" />
              </div>
            </div>

            <div style={progressOuterStyle}>
              <div style={{ ...progressInnerStyle, width: `${progress}%` }} />
            </div>
            <div style={smallTextStyle}>
              {nextLevel
                ? `${zogAffection.toLocaleString()} / ${nextLevel.threshold.toLocaleString()}，下阶段：${nextLevel.title}`
                : `${zogAffection.toLocaleString()}，Zog 已经把你列入顶级垃圾名单`}
            </div>

            <div style={zogGiftPreviewStyle}>
              {giftBubble ? (
                <div style={giftBubbleStyle(giftBubble.kind)}>
                  <strong>{giftBubble.title}</strong>
                  <span>{giftBubble.line}</span>
                  <small>{giftBubble.affectionText}</small>
                </div>
              ) : (
                <div style={idleBubbleStyle}>
                  <strong>冰箱气泡待机</strong>
                  <span>送礼后，效果会从 Zog 脑袋上弹出来。</span>
                </div>
              )}
              <img src={ZOG_HEAD_SRC} alt="" draggable={false} style={zogHeadStyle} />
            </div>
          </section>

          <section style={giftSectionStyle}>
            <div style={sectionTitleStyle}>Zog 好感礼物</div>
            <div style={giftGridStyle}>
              {ZOG_GIFTS.map((gift) => {
                const count = zogGiftInventory[gift.giftId] ?? 0;
                const canUse = count > 0;
                return (
                  <button
                    key={gift.giftId}
                    type="button"
                    disabled={!canUse}
                    onClick={() => giftZogById(gift.giftId)}
                    style={giftButtonStyle(canUse)}
                  >
                    <span style={{ fontWeight: 900 }}>{gift.name}</span>
                    <span>库存 x{count} / 基础 +{gift.affection} / 浮动 {getZogGiftAffectionRange(gift)}</span>
                    <small>{gift.flavor}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={chatSectionStyle}>
            <div style={chatHeaderStyle}>
              <div style={sectionTitleStyle}>冰箱聊天</div>
              <button type="button" onClick={clearChat} style={miniButtonStyle}>清空</button>
            </div>
            <div style={chatLogStyle}>
              {chatMessages.length === 0 ? (
                <div style={emptyChatStyle}>Zog 正在听冰箱里有没有节目声。</div>
              ) : (
                chatMessages.slice(-8).map((message, index) => (
                  <div
                    key={`${message.timestamp}_${index}`}
                    style={chatBubbleStyle(message.role)}
                  >
                    {message.content}
                  </div>
                ))
              )}
              {isZogTyping && <div style={chatBubbleStyle('zog')}>Zog 正在咬信号...</div>}
            </div>
            <form onSubmit={submitChat} style={chatFormStyle}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="跟 Zog 说点冰箱旁边的话..."
                style={chatInputStyle}
              />
              <button type="submit" disabled={!draft.trim() || isZogTyping} style={sendButtonStyle}>
                发送
              </button>
            </form>
          </section>
        </div>
      </section>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 120,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'rgba(5, 4, 12, 0.7)',
  color: '#f7edcf',
};

const panelStyle: React.CSSProperties = {
  width: 'min(1180px, 96vw)',
  maxHeight: '92vh',
  overflow: 'hidden',
  border: '1px solid rgba(123, 255, 214, 0.32)',
  borderRadius: 12,
  background:
    'linear-gradient(180deg, rgba(22, 24, 37, 0.98), rgba(12, 11, 21, 0.98)), radial-gradient(circle at 15% 0%, rgba(67, 255, 210, 0.2), transparent 45%)',
  boxShadow:
    '0 0 0 1px rgba(255,255,255,0.06) inset, 0 24px 80px rgba(0,0,0,0.62), 0 0 34px rgba(64, 255, 210, 0.16)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  padding: '22px 24px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const eyebrowStyle: React.CSSProperties = {
  color: '#6fffe0',
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '0.08em',
};

const titleStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: '#fff3bf',
  fontSize: 26,
  lineHeight: 1,
};

const closeButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  color: '#f5dfac',
  padding: '8px 14px',
  cursor: 'pointer',
  fontWeight: 900,
};

const bodyStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '310px minmax(360px, 1fr) 330px',
  gap: 16,
  padding: 18,
};

const statusStyle: React.CSSProperties = {
  minWidth: 0,
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: 14,
  background: 'rgba(255,255,255,0.045)',
};

const labelStyle: React.CSSProperties = {
  color: '#9fb8c9',
  fontSize: 12,
  fontWeight: 800,
};

const levelStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 5,
  color: '#fff2b6',
  fontSize: 20,
  lineHeight: 1.2,
};

const goldStyle: React.CSSProperties = {
  display: 'inline-grid',
  justifyContent: 'end',
  marginTop: 5,
  color: '#ffd75a',
  fontSize: 20,
  fontWeight: 900,
};

const progressOuterStyle: React.CSSProperties = {
  height: 12,
  marginTop: 18,
  borderRadius: 999,
  background: 'rgba(0,0,0,0.36)',
  overflow: 'hidden',
};

const progressInnerStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, #62ffd9, #fff173)',
  boxShadow: '0 0 14px rgba(98,255,217,0.54)',
};

const smallTextStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#b9b0c2',
  fontSize: 12,
  lineHeight: 1.45,
};

const zogGiftPreviewStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: 210,
  marginTop: 18,
  overflow: 'hidden',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background:
    'radial-gradient(circle at 72% 80%, rgba(255, 231, 113, 0.16), transparent 42%), linear-gradient(180deg, rgba(9, 12, 23, 0.46), rgba(0,0,0,0.16))',
};

const zogHeadStyle: React.CSSProperties = {
  position: 'absolute',
  right: -18,
  bottom: -38,
  width: 170,
  height: 170,
  objectFit: 'contain',
  filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.52)) drop-shadow(0 0 12px rgba(255, 237, 114, 0.22))',
  userSelect: 'none',
  pointerEvents: 'none',
};

const idleBubbleStyle: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  right: 84,
  top: 18,
  display: 'grid',
  gap: 6,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(137, 228, 255, 0.22)',
  background: 'rgba(80, 120, 150, 0.1)',
  color: '#cdeaf2',
  fontSize: 13,
  lineHeight: 1.42,
};

function giftBubbleStyle(kind: ZogGiftBubble['kind']): React.CSSProperties {
  const isPositive = kind === 'positive';
  return {
    position: 'absolute',
    left: 12,
    right: 76,
    top: 14,
    display: 'grid',
    gap: 6,
    padding: '13px 15px',
    borderRadius: 13,
    border: `1px solid ${isPositive ? 'rgba(110,255,188,0.48)' : 'rgba(255,132,117,0.5)'}`,
    background: isPositive
      ? 'linear-gradient(180deg, rgba(38, 91, 75, 0.5), rgba(12, 31, 32, 0.72))'
      : 'linear-gradient(180deg, rgba(103, 48, 54, 0.52), rgba(35, 16, 27, 0.74))',
    color: isPositive ? '#dbffea' : '#ffe1db',
    boxShadow: isPositive
      ? 'inset 0 0 18px rgba(92,255,185,0.2), 0 0 18px rgba(92,255,185,0.12)'
      : 'inset 0 0 18px rgba(255,120,104,0.18), 0 0 18px rgba(255,120,104,0.1)',
    fontSize: 13,
    lineHeight: 1.42,
  };
}

const giftSectionStyle: React.CSSProperties = {
  minWidth: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#ffdf75',
  fontSize: 14,
  fontWeight: 900,
  marginBottom: 10,
};

const giftGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
  maxHeight: 520,
  overflowY: 'auto',
  paddingRight: 4,
};

function giftButtonStyle(canBuy: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gap: 5,
    minHeight: 104,
    padding: 12,
    textAlign: 'left',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    background: canBuy
      ? 'linear-gradient(180deg, rgba(37, 46, 67, 0.96), rgba(24, 26, 42, 0.96))'
      : 'rgba(18,18,27,0.78)',
    color: canBuy ? '#f9efd3' : '#777184',
    cursor: canBuy ? 'pointer' : 'default',
    boxShadow: canBuy ? '0 0 18px rgba(81, 255, 217, 0.08)' : undefined,
  };
}

const chatSectionStyle: React.CSSProperties = {
  minWidth: 0,
  display: 'grid',
  gridTemplateRows: 'auto minmax(260px, 1fr) auto',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: 12,
  background: 'rgba(255,255,255,0.04)',
};

const chatHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const miniButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 7,
  background: 'rgba(255,255,255,0.06)',
  color: '#cfc3d7',
  cursor: 'pointer',
  padding: '5px 8px',
  fontSize: 12,
};

const chatLogStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minHeight: 0,
  overflowY: 'auto',
  padding: '4px 2px 10px',
};

const emptyChatStyle: React.CSSProperties = {
  color: '#8e879a',
  fontSize: 13,
  lineHeight: 1.5,
};

function chatBubbleStyle(role: 'user' | 'zog'): React.CSSProperties {
  return {
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '86%',
    padding: '8px 10px',
    borderRadius: 9,
    background: role === 'user' ? 'rgba(255, 220, 111, 0.16)' : 'rgba(89, 255, 217, 0.11)',
    border: `1px solid ${role === 'user' ? 'rgba(255, 220, 111, 0.22)' : 'rgba(89, 255, 217, 0.2)'}`,
    color: role === 'user' ? '#fff3c4' : '#ddfff6',
    fontSize: 13,
    lineHeight: 1.45,
  };
}

const chatFormStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 64px',
  gap: 8,
};

const chatInputStyle: React.CSSProperties = {
  minWidth: 0,
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 8,
  background: 'rgba(0,0,0,0.28)',
  color: '#f9efd3',
  padding: '9px 10px',
  outline: 'none',
};

const sendButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  background: '#ffe16f',
  color: '#22170c',
  fontWeight: 900,
  cursor: 'pointer',
};
