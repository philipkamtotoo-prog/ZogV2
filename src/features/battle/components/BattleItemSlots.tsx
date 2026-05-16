/**
 * 功能备注：战斗页右下“成为上帝”道具槽。
 * 负责展示玩家当前可用道具、选中态和选中道具名称，不处理道具实际效果。
 */
import type { ItemId } from '../../../core/economy/items';
import { assetPath as gameAssetPath } from '../../../shared/game-ui';
import { BATTLE_ASSETS, ITEM_SLOT_BOXES } from './battlePageConfig';

export interface BattleOwnedItem {
  itemId: ItemId;
  name: string;
  count: number;
  iconFile: string;
}

interface BattleItemSlotsProps {
  slotItems: (BattleOwnedItem | null)[];
  selectedItemId: ItemId | null;
  onSelectItem: (itemId: ItemId | null) => void;
}

const itemIcon = (file: string) => gameAssetPath('itemIcons', file);

export function BattleItemSlots({ slotItems, selectedItemId, onSelectItem }: BattleItemSlotsProps) {
  const selectedItem = selectedItemId ? slotItems.find((item) => item?.itemId === selectedItemId) : null;

  return (
    <section className="battle-god-panel" aria-label="Intervention panel">
      {ITEM_SLOT_BOXES.map((slot, index) => {
        const item = slotItems[index];
        const disabled = !item || item.count <= 0;
        const selected = Boolean(item && selectedItemId === item.itemId);
        return (
          <button
            className={`battle-item-slot${selected ? ' is-selected' : ''}`}
            disabled={disabled}
            key={index}
            onClick={() => item && !disabled && onSelectItem(selected ? null : item.itemId)}
            style={slot}
            title={item ? `${item.name} x${item.count}` : '空道具位'}
            type="button"
          >
            <img alt="" src={BATTLE_ASSETS.itemButton} />
            {item ? <img className="battle-item-slot-icon" alt="" src={itemIcon(item.iconFile)} /> : null}
            {item ? <span>{item.count}</span> : null}
          </button>
        );
      })}
      {selectedItem ? <div className="battle-selected-item">{selectedItem.name}</div> : null}
    </section>
  );
}
