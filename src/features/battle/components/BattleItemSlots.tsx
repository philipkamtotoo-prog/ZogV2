/**
 * 功能备注：战斗页右下“成为上帝”道具槽。
 * 负责展示玩家当前可用道具、选中态和选中道具名称，不处理道具实际效果。
 */
import type { ItemId } from '../../../core/economy/items';
import { BATTLE_ASSETS, ITEM_SLOT_BOXES } from './battlePageConfig';

export interface BattleOwnedItem {
  itemId: ItemId;
  name: string;
  count: number;
}

interface BattleItemSlotsProps {
  ownedItems: BattleOwnedItem[];
  selectedItemId: ItemId | null;
  onSelectItem: (itemId: ItemId | null) => void;
}

export function BattleItemSlots({ ownedItems, selectedItemId, onSelectItem }: BattleItemSlotsProps) {
  const selectedItem = selectedItemId ? ownedItems.find((item) => item.itemId === selectedItemId) : null;

  return (
    <section className="battle-god-panel" aria-label="Intervention panel">
      {ITEM_SLOT_BOXES.map((slot, index) => {
        const item = ownedItems[index];
        const selected = Boolean(item && selectedItemId === item.itemId);
        return (
          <button
            className={`battle-item-slot${selected ? ' is-selected' : ''}`}
            disabled={!item}
            key={index}
            onClick={() => item && onSelectItem(selected ? null : item.itemId)}
            style={slot}
            title={item ? `${item.name} x${item.count}` : '空道具位'}
            type="button"
          >
            <img alt="" src={BATTLE_ASSETS.itemButton} />
            {item ? <span>{item.count}</span> : null}
          </button>
        );
      })}
      {selectedItem ? <div className="battle-selected-item">{selectedItem.name}</div> : null}
    </section>
  );
}
