import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import { getAllItems, type ItemDef, type ItemId } from '../../../core/economy/items';
import { CurrencyAmount, assetPath as gameAssetPath } from '../../../shared/game-ui';
import { ZOG_GIFTS, getZogGiftAffectionRange } from '../../zog/zogAffinity';
import { useLoungeStore } from '../loungeStore';
import { BackpackGlowPixiCanvas } from './BackpackGlowPixiCanvas';
import './BackpackPage.css';

interface BackpackPageProps {
  onBack: () => void;
}

type BackpackTab = 'battle' | 'snacks';

const STAGE_WIDTH = 1187;
const STAGE_HEIGHT = 938;

const backpackAsset = (file: string) => gameAssetPath('backpackOverlay', file);
const itemIcon = (file: string) => gameAssetPath('itemIcons', file);

const BACKPACK_ASSETS = {
  title: backpackAsset("ZOG's Preciousssss!.png"),
  panel: backpackAsset('手绘遮挡层.png'),
  contentMask: backpackAsset('背包大面板蒙版1.png'),
  purpleBoard: backpackAsset('紫色底板.png'),
  battleTab: backpackAsset('战斗道具.png'),
  snackTab: backpackAsset('Zog零食.png'),
  close: backpackAsset('退出按钮.png'),
  decor: backpackAsset('装饰2.png'),
  dodo: backpackAsset('渡渡鸟装饰1.png'),
  itemBaseLarge: backpackAsset('道具底板大.png'),
  itemBaseSmall: backpackAsset('道具底板小.png'),
  gold: itemIcon('G币icon.png'),
} as const;

const SNACK_ICONS: Record<string, string> = {
  'expired-star-chips': '过期星际薯片.png',
  'glowing-can': '发光罐头.png',
  'remote-battery-jerky': '遥控器电池肉干.png',
  'antenna-noodle': '天线泡面.png',
  'moon-cheese-wedge': '月球奶酪角.png',
  'rtx-cake': '显卡蛋糕.png',
  'comet-soda': '彗星汽水.png',
  'ssr-trash-orb': 'SSR闪光垃圾球.png',
};

const SNACK_FLAVOR_TEXT: Record<string, string> = {
  'expired-star-chips': '走私船丢弃的零食，包装漏风但嘎嘣脆。',
  'glowing-can': '辐射超标的荧光食品，能在停电时当台灯。',
  'remote-battery-jerky': '漏液电池腌制的谜之肉，很费外星牙口。',
  'antenna-noodle': '废弃天线煮的废土糊糊，吃完容易串台。',
  'moon-cheese-wedge': '带有陨石坑的昂贵奶酪，闻起来像石灰。',
  'rtx-cake': '散热极佳的硅脂甜点，风扇容易卡嗓子。',
  'comet-soda': '气泡能唱歌的宇宙饮料，小心喷满天花板。',
  'ssr-trash-orb': '废土最闪耀的工业废料，其实是块玻璃。',
};

function box(left: number, top: number, width: number, height: number): CSSProperties {
  return {
    left,
    top,
    width,
    height,
  };
}

const LAYOUT = {
  contentMask: box(100, 201, 733, 478),
  purpleBoard: box(51, 151, 1087, 574),
  title: box(131, 37, 334, 70),
  decor: box(361, -39, 123, 78),
  dodo: box(586, 31, 95, 112),
  battleTab: box(246, 133, 151, 40),
  snackTab: box(425, 134, 144, 42),
  close: box(1040, 47, 82, 80),
  gold: box(852, 66, 140, 58),
  battleGrid: box(118, 214, 665, 454),
  snackGrid: box(118, 214, 665, 454),
  description: box(828, 222, 214, 414),
  useLimit: box(872, 796, 118, 38),
} as const;

const BATTLE_CARD_POSITIONS = [
  box(0, -6, 225, 224),
  box(236, -6, 225, 224),
  box(468, -6, 225, 224),
  box(0, 234, 225, 224),
  box(236, 234, 225, 224),
] as const;

const QUICK_SLOT_BOXES = [
  box(331, 761, 121, 129),
  box(453, 761, 121, 129),
  box(575, 761, 121, 129),
  box(697, 761, 121, 129),
] as const;

export function BackpackPage({ onBack }: BackpackPageProps) {
  const {
    battleQuickSlots,
    fridgeItemUseLimit,
    gold,
    inventory,
    zogGiftInventory,
    setBattleQuickSlot,
  } = useLoungeStore();
  const backpackScale = useBackpackScale();
  const [activeTab, setActiveTab] = useState<BackpackTab>('battle');
  const battleItems = useMemo(() => getAllItems().filter((item) => item.usableInBattle), []);
  const [selectedBattleItemId, setSelectedBattleItemId] = useState<ItemId>(battleItems[0]?.itemId ?? 'HEAL_TINY');
  const [selectedSnackId, setSelectedSnackId] = useState(ZOG_GIFTS[0]?.giftId ?? '');

  const selectedBattleItem = battleItems.find((item) => item.itemId === selectedBattleItemId) ?? battleItems[0];
  const selectedSnack = ZOG_GIFTS.find((gift) => gift.giftId === selectedSnackId) ?? ZOG_GIFTS[0];
  const quickSlots = normalizeQuickSlots(battleQuickSlots);

  const handleDragStart = (event: DragEvent<HTMLElement>, itemId: ItemId) => {
    event.dataTransfer.setData('application/zog-item-id', itemId);
    event.dataTransfer.setData('text/plain', itemId);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLElement>, slotIndex: number) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('application/zog-item-id') || event.dataTransfer.getData('text/plain');
    if (!battleItems.some((item) => item.itemId === itemId)) return;
    setBattleQuickSlot(slotIndex, itemId as ItemId);
  };

  return (
    <div className="backpack-overlay" role="dialog" aria-modal="true" aria-label="背包浮层">
      <div
        className="backpack-modal"
        style={{ width: STAGE_WIDTH * backpackScale, height: STAGE_HEIGHT * backpackScale }}
      >
        <div className="backpack-stage" style={{ transform: `scale(${backpackScale})` }}>
          <img className="backpack-panel-art" alt="" src={BACKPACK_ASSETS.panel} draggable={false} />
          {activeTab === 'snacks' ? (
            <img className="backpack-purple-board" alt="" src={BACKPACK_ASSETS.purpleBoard} draggable={false} style={LAYOUT.purpleBoard} />
          ) : null}
          <img className="backpack-content-mask" alt="" src={BACKPACK_ASSETS.contentMask} draggable={false} style={LAYOUT.contentMask} />

          <BackpackGlowPixiCanvas activeTab={activeTab} width={STAGE_WIDTH} height={STAGE_HEIGHT} />

          <div className="backpack-title-glow-layer" style={LAYOUT.title} aria-hidden="true">
            <img alt="" src={BACKPACK_ASSETS.title} draggable={false} />
          </div>
          <img className="backpack-title" alt="ZOG's Preciousssss!" src={BACKPACK_ASSETS.title} draggable={false} style={LAYOUT.title} />
          <img className="backpack-decor" alt="" src={BACKPACK_ASSETS.decor} draggable={false} style={LAYOUT.decor} />
          <img className="backpack-dodo" alt="" src={BACKPACK_ASSETS.dodo} draggable={false} style={LAYOUT.dodo} />

          <div className="backpack-currency" style={LAYOUT.gold}>
            <img alt="" src={BACKPACK_ASSETS.gold} draggable={false} />
            <strong>{gold.toLocaleString()}</strong>
          </div>

          <button className="backpack-tab-button" onClick={() => setActiveTab('battle')} style={LAYOUT.battleTab} type="button">
            <img alt="战斗道具" src={BACKPACK_ASSETS.battleTab} draggable={false} />
          </button>
          <button className="backpack-tab-button" onClick={() => setActiveTab('snacks')} style={LAYOUT.snackTab} type="button">
            <img alt="Zog 零食" src={BACKPACK_ASSETS.snackTab} draggable={false} />
          </button>

          <button className="backpack-close" onClick={onBack} style={LAYOUT.close} type="button" aria-label="关闭背包">
            <img alt="" src={BACKPACK_ASSETS.close} draggable={false} />
          </button>

          {activeTab === 'battle' ? (
            <BattleInventoryContent
              inventory={inventory}
              items={battleItems}
              onDragStart={handleDragStart}
              onSelect={setSelectedBattleItemId}
              selectedItem={selectedBattleItem}
            />
          ) : (
            <SnackInventoryContent
              inventory={zogGiftInventory}
              onSelect={setSelectedSnackId}
              selectedSnackId={selectedSnack?.giftId}
            />
          )}

          <QuickSlotBar
            battleItems={battleItems}
            inventory={inventory}
            onDrop={handleDrop}
            quickSlots={quickSlots}
            setBattleQuickSlot={setBattleQuickSlot}
          />

          <div className="backpack-use-limit" style={LAYOUT.useLimit}>
            每局 x{fridgeItemUseLimit}
          </div>
        </div>
      </div>
    </div>
  );
}

function BattleInventoryContent({
  inventory,
  items,
  onDragStart,
  onSelect,
  selectedItem,
}: {
  inventory: Record<string, number>;
  items: ItemDef[];
  onDragStart: (event: DragEvent<HTMLElement>, itemId: ItemId) => void;
  onSelect: (itemId: ItemId) => void;
  selectedItem?: ItemDef;
}) {
  return (
    <>
      <div className="backpack-battle-grid" style={LAYOUT.battleGrid}>
        {items.map((item, index) => {
          const count = inventory[item.itemId] ?? 0;
          const selected = selectedItem?.itemId === item.itemId;
          return (
            <button
              className={`backpack-item-card${selected ? ' is-selected' : ''}`}
              style={BATTLE_CARD_POSITIONS[index]}
              key={item.itemId}
              onClick={() => onSelect(item.itemId)}
              title="拖到下方战斗快捷栏"
              type="button"
            >
              <img className="backpack-item-base" alt="" src={BACKPACK_ASSETS.itemBaseLarge} draggable={false} />
              <span className="backpack-item-name">{item.name}</span>
              <img
                className="backpack-item-icon is-draggable-icon"
                alt=""
                src={itemIcon(item.iconFile)}
                draggable
                onDragStart={(event) => onDragStart(event, item.itemId)}
              />
              <span className="backpack-item-count">x{count}</span>
              <span className="backpack-item-effect"><mark>{item.effectLabel}</mark></span>
            </button>
          );
        })}
      </div>

      {selectedItem ? (
        <ItemDescriptionPanel inventory={inventory} item={selectedItem} />
      ) : null}
    </>
  );
}

function ItemDescriptionPanel({ inventory, item }: { inventory: Record<string, number>; item: ItemDef }) {
  return (
    <section className="backpack-description" style={box(870, 181, 248, 515)}>
      <h3>{item.name}</h3>
      <img alt="" src={itemIcon(item.iconFile)} draggable={false} />
      <div className="backpack-description-stats">
        <div className="backpack-description-line">
          <strong>效果</strong>
          <span>{item.effectLabel}</span>
        </div>
        <div className="backpack-description-line">
          <strong>副作用</strong>
          <span>{item.sideEffectLabel}</span>
        </div>
      </div>
      <p className="backpack-description-rule">{item.description}</p>
      <p className="backpack-description-flavor">{item.flavorText}</p>
      <small>库存 x{inventory[item.itemId] ?? 0} / 价格 <CurrencyAmount value={item.cost} variant="gold" /></small>
    </section>
  );
}

function SnackInventoryContent({
  inventory,
  onSelect,
  selectedSnackId,
}: {
  inventory: Record<string, number>;
  onSelect: (giftId: string) => void;
  selectedSnackId?: string;
}) {
  const selectedSnack = ZOG_GIFTS.find((gift) => gift.giftId === selectedSnackId) ?? ZOG_GIFTS[0];
  const selectedRange = getZogGiftAffectionRange(selectedSnack);

  return (
    <>
      <div className="backpack-snack-scroll" style={LAYOUT.snackGrid}>
        <div className="backpack-snack-grid">
          {ZOG_GIFTS.map((gift) => {
            const iconFile = SNACK_ICONS[gift.giftId];
            const count = inventory[gift.giftId] ?? 0;
            return (
              <button
                className={`backpack-snack-card${gift.giftId === selectedSnack?.giftId ? ' is-selected' : ''}`}
                key={gift.giftId}
                onClick={() => onSelect(gift.giftId)}
                type="button"
              >
                <img className="backpack-item-base" alt="" src={BACKPACK_ASSETS.itemBaseLarge} draggable={false} />
                {iconFile ? <img className="backpack-snack-icon" alt="" src={itemIcon(iconFile)} draggable={false} /> : null}
                <span>{gift.name}</span>
                <b className="backpack-snack-count">x{count}</b>
                <small>好感：{getZogGiftAffectionRange(gift)}</small>
              </button>
            );
          })}
        </div>
      </div>

      {selectedSnack ? (
        <section className="backpack-description is-snack" style={box(870, 181, 248, 515)}>
          <h3>{selectedSnack.name}</h3>
          <img alt="" src={itemIcon(SNACK_ICONS[selectedSnack.giftId])} draggable={false} />
          <div className="backpack-description-stats is-single">
            <div className="backpack-description-line">
              <strong>基础好感</strong>
              <span>+{selectedSnack.affection}</span>
            </div>
            <div className="backpack-description-line">
              <strong>浮动</strong>
              <span>{selectedRange}</span>
            </div>
          </div>
          <p className="backpack-description-rule">{selectedSnack.flavor}</p>
          <p className="backpack-description-flavor">{SNACK_FLAVOR_TEXT[selectedSnack.giftId] ?? ''}</p>
          <small>库存 x{inventory[selectedSnack.giftId] ?? 0} / 售价 <CurrencyAmount value={selectedSnack.cost} variant="gold" /></small>
        </section>
      ) : null}
    </>
  );
}

function QuickSlotBar({
  battleItems,
  inventory,
  onDrop,
  quickSlots,
  setBattleQuickSlot,
}: {
  battleItems: ItemDef[];
  inventory: Record<string, number>;
  onDrop: (event: DragEvent<HTMLElement>, slotIndex: number) => void;
  quickSlots: (ItemId | null)[];
  setBattleQuickSlot: (slotIndex: number, itemId: ItemId | null) => void;
}) {
  return (
    <section className="backpack-quickbar" aria-label="战斗快捷栏">
        {quickSlots.map((itemId, index) => {
          const item = itemId ? battleItems.find((candidate) => candidate.itemId === itemId) : null;
          return (
            <button
              className={`backpack-quick-slot${item ? ' has-item' : ''}`}
              style={QUICK_SLOT_BOXES[index]}
              key={index}
              onClick={() => item && setBattleQuickSlot(index, null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, index)}
              title={item ? '点击清空，或拖入其他道具替换' : '拖入战斗道具'}
              type="button"
            >
              <img className="backpack-quick-base" alt="" src={BACKPACK_ASSETS.itemBaseSmall} draggable={false} />
              {item ? (
                <>
                  <img className="backpack-quick-icon" alt="" src={itemIcon(item.iconFile)} draggable={false} />
                  <span>x{inventory[item.itemId] ?? 0}</span>
                </>
              ) : null}
            </button>
          );
        })}
    </section>
  );
}

function normalizeQuickSlots(value: (ItemId | null)[] | undefined): (ItemId | null)[] {
  return Array.from({ length: 4 }, (_, index) => value?.[index] ?? null);
}

function useBackpackScale(): number {
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return 0.6;
    return getBackpackScale(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const update = () => setScale(getBackpackScale(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}

function getBackpackScale(viewportWidth: number, viewportHeight: number): number {
  return Math.min(1, (viewportWidth * 0.6) / STAGE_WIDTH, (viewportHeight * 0.92) / STAGE_HEIGHT);
}
