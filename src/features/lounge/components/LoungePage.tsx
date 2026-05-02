import { useEffect, useRef, useState } from 'react';
import { useLoungeStore, ZOG_GIFT_TIERS, type ChatMessage } from '../loungeStore';

interface LoungePageProps {
  onEnterTV: () => void;
  onOpenShop: () => void;
  onOpenReports: () => void;
  onOpenRoster: () => void;
  onOpenSettings: () => void;
}

export function LoungePage({ onEnterTV, onOpenShop, onOpenReports, onOpenRoster, onOpenSettings }: LoungePageProps) {
  const {
    gold, zogAffection, begMessage,
    collectIdleIncome, beg, canBeg, giftZog,
    chatMessages, isZogTyping, sendChat, clearChat,
  } = useLoungeStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const result = collectIdleIncome();
    if (result.goldEarned > 0) {
      console.log(`Collected ${result.goldEarned}G idle income`);
    }
  }, [collectIdleIncome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isZogTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendChat(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ color: '#ffeb3b', marginBottom: 4, textAlign: 'center' }}>Zog's Living Room</h1>
      <p style={{ color: '#888', textAlign: 'center', marginBottom: 24, fontSize: 13 }}>
        You and Zog are sitting on the couch, watching TV.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
        <Stat label="Gold" value={`${gold}G`} color="#ffeb3b" />
        <Stat label="Zog Affection" value={String(zogAffection)} color="#f48fb1" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <BigButton onClick={onEnterTV} color="#ff9800">
          Watch TV (Start Battle)
        </BigButton>
        <BigButton onClick={onOpenShop} color="#2196f3">
          Shop
        </BigButton>
        <BigButton onClick={onOpenReports} color="#9c27b0">
          Battle Reports
        </BigButton>
        <BigButton onClick={onOpenRoster} color="#4caf50">
          Actor Roster
        </BigButton>
        <BigButton onClick={onOpenSettings} color="#607d8b">
          Settings
        </BigButton>
      </div>

      {/* 聊天区域 */}
      <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ color: '#88ccff', fontSize: 12, fontWeight: 'bold' }}>Chat with Zog</span>
          {chatMessages.length > 0 && (
            <button onClick={clearChat} style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', background: '#333', color: '#888', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>

        {/* 消息列表 */}
        <div style={{
          height: 200,
          overflowY: 'auto',
          background: '#0a1a1a',
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {chatMessages.length === 0 && !isZogTyping && (
            <div style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 60 }}>
              Say something to Zog...
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {isZogTyping && (
            <div style={{ color: '#ffd54f', fontSize: 12 }}>
              Zog is thinking<span style={{ animation: 'blink 1s infinite' }}>...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to Zog..."
            disabled={isZogTyping}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #333',
              background: '#111',
              color: '#eee',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={isZogTyping || !input.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: isZogTyping ? '#333' : '#ffd54f',
              color: isZogTyping ? '#666' : '#111',
              fontSize: 13,
              fontWeight: 'bold',
              cursor: isZogTyping ? 'default' : 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Zog 互动按钮 */}
      <div style={{ borderTop: '1px solid #333', paddingTop: 16 }}>
        <div style={{ color: '#88ccff', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Zog</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={beg}
            disabled={!canBeg()}
            style={{
              padding: '6px 16px', borderRadius: 4, border: 'none', fontSize: 12,
              background: canBeg() ? '#555' : '#333',
              color: canBeg() ? '#eee' : '#666',
              cursor: canBeg() ? 'pointer' : 'default',
            }}
          >
            Beg for Gold
          </button>
          {ZOG_GIFT_TIERS.map((tier) => (
            <button
              key={tier.cost}
              onClick={() => giftZog(tier.cost)}
              disabled={gold < tier.cost}
              style={{
                padding: '6px 12px', borderRadius: 4, border: 'none', fontSize: 12,
                background: gold >= tier.cost ? '#555' : '#333',
                color: gold >= tier.cost ? '#f48fb1' : '#666',
                cursor: gold >= tier.cost ? 'pointer' : 'default',
              }}
            >
              送礼物 ({tier.cost}G +{tier.affection})
            </button>
          ))}
        </div>

        {begMessage && (
          <div style={{ color: '#aaa', fontSize: 12, fontStyle: 'italic' }}>{begMessage}</div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
    }}>
      <div style={{
        display: 'inline-block',
        padding: '6px 10px',
        borderRadius: 12,
        background: isUser ? '#1e3a5f' : '#2a2a1a',
        color: isUser ? '#ddd' : '#ffd54f',
        fontSize: 13,
        lineHeight: 1.4,
      }}>
        {message.content}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, fontSize: 24, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#888', fontSize: 11 }}>{label}</div>
    </div>
  );
}

function BigButton({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 0', borderRadius: 8, border: 'none',
        background: color, color: '#fff', cursor: 'pointer',
        fontSize: 14, fontWeight: 'bold',
      }}
    >
      {children}
    </button>
  );
}
