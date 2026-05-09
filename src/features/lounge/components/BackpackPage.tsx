import { useLoungeStore } from '../loungeStore';
import { getAllItems } from '../../../core/economy/items';

interface BackpackPageProps {
  onBack: () => void;
}

export function BackpackPage({ onBack }: BackpackPageProps) {
  const { inventory } = useLoungeStore();
  const items = getAllItems();

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ color: '#ffeb3b', margin: 0 }}>背包</h2>
          <div style={{ color: '#8f86a1', fontSize: 12, marginTop: 4 }}>这里显示你已经拥有的道具和数量。</div>
        </div>
        <button onClick={onBack} style={backBtnStyle}>返回</button>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item) => {
          const count = inventory[item.itemId] ?? 0;
          return (
            <div key={item.itemId} style={cardStyle}>
              <div>
                <div style={{ color: '#f3efe6', fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                <div style={{ color: '#a79bb8', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{item.description}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 80 }}>
                <div style={{ color: count > 0 ? '#7cff8f' : '#7f768f', fontSize: 26, fontWeight: 800 }}>{count}</div>
                <div style={{ color: '#887c99', fontSize: 11 }}>x 件</div>
                <div style={{ color: '#b6acbf', fontSize: 11, marginTop: 6 }}>
                  {item.usableInBattle ? '可在战斗中使用' : '不可在战斗中使用'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  padding: 24,
  maxWidth: 880,
  margin: '0 auto',
  color: '#eee',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 18,
};

const cardStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  padding: 16,
  borderRadius: 18,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(24, 20, 33, 0.88)',
  boxShadow: '0 16px 30px rgba(0, 0, 0, 0.18)',
};

const backBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.06)',
  color: '#d8cfdf',
  cursor: 'pointer',
  fontSize: 12,
};
