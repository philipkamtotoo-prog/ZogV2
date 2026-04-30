import { useState } from 'react';
import { useBattleStore } from '../battleStore';
import { useLoungeStore } from '../../lounge/loungeStore';
import { ITEM_DEFS, type ItemId } from '../../../core/economy/items';

export function ItemPanel() {
  const { battleState, useItem } = useBattleStore();
  const { inventory, removeItem } = useLoungeStore();
  const [selectedItem, setSelectedItem] = useState<ItemId | null>(null);

  if (!battleState || battleState.phase !== 'RUNNING') return null;

  const aliveActors = battleState.actors.filter((a) => a.isAlive);
  const ownedItems = Object.entries(inventory)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ ...ITEM_DEFS[id as ItemId], count }));

  if (ownedItems.length === 0) return null;

  const handleUse = (actorId: string) => {
    if (!selectedItem) return;
    const result = useItem(selectedItem, actorId);
    if (!result || !result.ok) return;
    removeItem(selectedItem);
    setSelectedItem(null);
  };

  return (
    <div style={{
      padding: 8, borderRadius: 6, background: '#1a1a2e',
      border: '1px solid #333', marginBottom: 8,
    }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>道具</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: selectedItem ? 6 : 0 }}>
        {ownedItems.map((item) => (
          <button
            key={item.itemId}
            onClick={() => setSelectedItem(selectedItem === item.itemId ? null : item.itemId)}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none', fontSize: 11,
              background: selectedItem === item.itemId ? '#ff9800' : '#333',
              color: selectedItem === item.itemId ? '#fff' : '#ccc',
              cursor: 'pointer',
            }}
          >
            {item.name} x{item.count}
          </button>
        ))}
      </div>
      {selectedItem && (
        <div>
          <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>
            {ITEM_DEFS[selectedItem].description} — 选择目标:
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {aliveActors.map((a) => (
              <button
                key={a.actorId}
                onClick={() => handleUse(a.actorId)}
                style={{
                  padding: '3px 8px', borderRadius: 3, border: 'none',
                  background: '#2a4a2a', color: '#4caf50', fontSize: 11, cursor: 'pointer',
                }}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
