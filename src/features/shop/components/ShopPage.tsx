import { useLoungeStore, EQUIPMENT_UPGRADE_COSTS, FRIDGE_USES, KEYBOARD_LIMITS } from '../../lounge/loungeStore';
import { getShopItems } from '../shopStore';
import { buyItem } from '../shopStore';

interface ShopPageProps {
  onBack: () => void;
}

export function ShopPage({ onBack }: ShopPageProps) {
  const { 
    gold, inventory, 
    fridgeLevel, keyboardLevel, 
    upgradeEquipment 
  } = useLoungeStore();
  const items = getShopItems();
  const equipmentLevel = Math.max(fridgeLevel, keyboardLevel);
  const nextEquipmentCost = EQUIPMENT_UPGRADE_COSTS[equipmentLevel] ?? Infinity;
  const canUpgradeEquipment = equipmentLevel < 5 && gold >= nextEquipmentCost;

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#ffeb3b', margin: 0 }}>Shop</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>{gold}G</span>
          <button onClick={onBack} style={backBtnStyle}>Back</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section>
          <div style={{ color: '#88ccff', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Consumables</div>
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
        </section>

        <section>
          <div style={{ color: '#88ccff', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Upgrades</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            
            <div style={upgradeCardStyle}>
              <div>
                <div style={{ color: '#eee', fontWeight: 'bold', fontSize: 14 }}>Shared Equipment Lv.{equipmentLevel}</div>
                <div style={{ color: '#888', fontSize: 12 }}>
                  Fridge uses: {FRIDGE_USES[equipmentLevel]} per battle.
                  Keyboard limit: {KEYBOARD_LIMITS[equipmentLevel]} chars.
                  {equipmentLevel < 5 && ` Next: ${FRIDGE_USES[equipmentLevel + 1]} uses / ${KEYBOARD_LIMITS[equipmentLevel + 1]} chars.`}
                </div>
              </div>
              <button
                onClick={upgradeEquipment}
                disabled={!canUpgradeEquipment}
                style={upgradeButtonStyle(canUpgradeEquipment)}
              >
                {equipmentLevel >= 5 ? 'MAX' : `${nextEquipmentCost}G`}
              </button>
            </div>

          </div>
        </section>
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

const upgradeCardStyle: React.CSSProperties = {
  padding: 12,
  background: '#1a1a2e',
  borderRadius: 8,
  border: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

function upgradeButtonStyle(canBuy: boolean): React.CSSProperties {
  return {
    padding: '6px 16px', borderRadius: 4, border: 'none', fontSize: 12,
    background: canBuy ? '#2196f3' : '#333',
    color: canBuy ? '#fff' : '#666',
    cursor: canBuy ? 'pointer' : 'default',
    whiteSpace: 'nowrap',
  };
}
