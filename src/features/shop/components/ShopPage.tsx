import { useLoungeStore } from '../../lounge/loungeStore';
import { getShopItems } from '../shopStore';
import { buyItem } from '../shopStore';

interface ShopPageProps {
  onBack: () => void;
}

export function ShopPage({ onBack }: ShopPageProps) {
  const { gold, inventory } = useLoungeStore();
  const items = getShopItems();

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#ffeb3b', margin: 0 }}>Shop</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>{gold}G</span>
          <button onClick={onBack} style={backBtnStyle}>Back</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const owned = inventory[item.itemId] ?? 0;
          const canBuy = gold >= item.cost;

          return (
            <div
              key={item.itemId}
              style={{
                padding: 12,
                background: '#1a1a2e',
                borderRadius: 8,
                border: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#eee', fontWeight: 'bold', fontSize: 14 }}>{item.name}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{item.description}</div>
                {owned > 0 && <div style={{ color: '#4caf50', fontSize: 11, marginTop: 2 }}>Owned: {owned}</div>}
              </div>
              <button
                onClick={() => buyItem(item.itemId, item.cost)}
                disabled={!canBuy}
                style={{
                  padding: '6px 16px', borderRadius: 4, border: 'none', fontSize: 12,
                  background: canBuy ? '#ff9800' : '#333',
                  color: canBuy ? '#fff' : '#666',
                  cursor: canBuy ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.cost}G
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
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
