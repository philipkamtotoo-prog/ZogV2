import { getAllItems, type ItemId, type ItemDef } from '../../core/economy/items';
import { useLoungeStore } from '../lounge/loungeStore';

export function getShopItems(): ItemDef[] {
  return getAllItems();
}

export function buyItem(itemId: ItemId, cost: number): boolean {
  const store = useLoungeStore.getState();
  const spent = store.spendGold(cost);
  if (!spent) return false;
  store.addItem(itemId);
  return true;
}
