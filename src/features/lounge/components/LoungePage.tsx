import { useEffect } from 'react';
import { useLoungeStore, ZOG_GIFT_TIERS } from '../loungeStore';

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
  } = useLoungeStore();

  useEffect(() => {
    const result = collectIdleIncome();
    if (result.goldEarned > 0) {
      console.log(`Collected ${result.goldEarned}G idle income`);
    }
  }, [collectIdleIncome]);

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
