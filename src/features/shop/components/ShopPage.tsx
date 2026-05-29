import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getAllItems, type ItemDef } from '../../../core/economy/items';
import { ZOG_GIFTS, getZogGiftAffectionRange, type ZogGiftDef } from '../../zog/zogAffinity';
import { EQUIPMENT_UPGRADE_COSTS, FRIDGE_USES, KEYBOARD_LIMITS, getRandomActorShardPurchaseCost, useLoungeStore } from '../../lounge/loungeStore';
import { CurrencyAmount } from '../../../shared/game-ui';
import { buyItem } from '../shopStore';
import { ShopGlowPixiCanvas } from './ShopGlowPixiCanvas';
import './ShopPage.css';

interface ShopPageProps {
  onBack: () => void;
}

type ShopTab = 'battle' | 'snacks' | 'equipment';
type ShopEntry =
  | { kind: 'battle'; id: string; name: string; cost: number; owned: number; iconFile: string; item: ItemDef }
  | { kind: 'snack'; id: string; name: string; cost: number; owned: number; iconFile: string; gift: ZogGiftDef };

const STAGE_WIDTH = 1416;
const STAGE_HEIGHT = 1073;

const shopAsset = (file: string) => `/商店浮层/${encodeURIComponent(file)}`;
const itemIcon = (file: string) => `/道具icon/${encodeURIComponent(file)}`;
const backpackAsset = (file: string) => `/背包浮层/${encodeURIComponent(file)}`;

const SHOP_ASSETS = {
  background: shopAsset('深色底板.png'),
  close: shopAsset('退出按钮.png'),
  greenTab: shopAsset('绿色底板.png'),
  battleText: shopAsset('战斗补给.png'),
  battleIcon: shopAsset('战斗补寄icon.png'),
  snackText: shopAsset('ZOg零食.png'),
  snackIcon: shopAsset('zog零食icon.png'),
  equipmentText: shopAsset('设备升级.png'),
  equipmentIcon: shopAsset('设备升级icon.png'),
  sign: shopAsset('宇宙杂货店.png'),
  buy: shopAsset('购买按钮.png'),
  pendant: shopAsset('晃动的外星飞船挂件.png'),
  floatDecor: shopAsset('上下悬浮飞动晃动1.png'),
  swingDecor: shopAsset('左右低频晃动2.png'),
  itemBaseLarge: backpackAsset('道具底板大.png'),
  gold: itemIcon('G币icon.png'),
  glow1: shopAsset('发光点1.png'),
  glow2: shopAsset('发光点2.png'),
  glow3: shopAsset('发光点3.png'),
  glow4: shopAsset('发光点4.png'),
  glow5: shopAsset('发光点5.png'),
  glow6: shopAsset('发光点6.png'),
  glow7: shopAsset('发光点7.png'),
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

const BATTLE_DESCRIPTIONS: Record<string, string> = {
  HEAL_TINY: '目标演员恢复 10 HP。没有副作用，是节目组少数能放心入口的东西。',
  HEAL_SMALL: '目标演员恢复 20 HP。20% 概率获得“肠胃不适”，下一次行动无法攻击。',
  HEAL_MEDIUM: '目标演员恢复 35 HP。没有副作用，罐头环切口略有节目感。',
  HEAL_GAMBLE: '尝试恢复 100 HP。35% 概率失败，失败时不恢复 HP。',
  SHIELD_GRANT: '目标演员恢复 60 HP，并获得 1 次护盾；同时获得嘲讽，下一次行动前更容易被攻击。',
};

const SNACK_DESCRIPTIONS: Record<string, string> = {
  'expired-star-chips': '过期但嘎嘣脆的星际薯片，Zog 会先检查包装袋有没有收藏价值。',
  'glowing-can': '辐射超标的荧光罐头，送出去之前最好别关灯。',
  'remote-battery-jerky': '漏液电池腌制的谜之肉，很费外星牙口。',
  'antenna-noodle': '废弃天线煮的废土糊糊，吃完容易串台。',
  'moon-cheese-wedge': '带有陨石坑的昂贵奶酪，闻起来像石灰。',
  'rtx-cake': '散热极佳的硅脂甜点，风扇容易卡嗓子。',
  'comet-soda': '气泡能唱歌的宇宙饮料，小心喷满天花板。',
  'ssr-trash-orb': '废土最闪耀的工业废料，其实是块玻璃。',
};

const TAB_LAYOUT: Record<ShopTab, { base: CSSProperties; icon: CSSProperties; text: CSSProperties }> = {
  battle: { base: box(112, 242, 320, 97), icon: box(25, 15, 51, 68), text: box(86, 25, 202, 50) },
  snacks: { base: box(438, 242, 332, 97), icon: box(32, 22, 60, 61), text: box(103, 24, 207, 50) },
  equipment: { base: box(779, 240, 320, 97), icon: box(20, 17, 63, 68), text: box(90, 27, 201, 49) },
};

const TAB_ART: Record<ShopTab, { icon: string; text: string; label: string }> = {
  battle: { icon: SHOP_ASSETS.battleIcon, text: SHOP_ASSETS.battleText, label: '战斗补给' },
  snacks: { icon: SHOP_ASSETS.snackIcon, text: SHOP_ASSETS.snackText, label: 'Zog 零食' },
  equipment: { icon: SHOP_ASSETS.equipmentIcon, text: SHOP_ASSETS.equipmentText, label: '设备升级' },
};

export function ShopPage({ onBack }: ShopPageProps) {
  const {
    gold,
    inventory,
    zogGiftInventory,
    fridgeLevel,
    keyboardLevel,
    randomShardPurchaseCount,
    upgradeEquipment,
    buyZogGiftById,
    buyRandomActorShard,
  } = useLoungeStore();
  const shopScale = useShopScale();
  const [activeTab, setActiveTab] = useState<ShopTab>('battle');
  const [quantity, setQuantity] = useState(1);
  const [shopToast, setShopToast] = useState<string | null>(null);
  const battleEntries = useMemo<ShopEntry[]>(() => getAllItems().map((item) => ({
    kind: 'battle',
    id: item.itemId,
    name: item.name,
    cost: item.cost,
    owned: inventory[item.itemId] ?? 0,
    iconFile: item.iconFile,
    item,
  })), [inventory]);
  const snackEntries = useMemo<ShopEntry[]>(() => ZOG_GIFTS.map((gift) => ({
    kind: 'snack',
    id: gift.giftId,
    name: gift.name,
    cost: gift.cost,
    owned: zogGiftInventory[gift.giftId] ?? 0,
    iconFile: SNACK_ICONS[gift.giftId],
    gift,
  })), [zogGiftInventory]);
  const entries = activeTab === 'snacks' ? snackEntries : battleEntries;
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? '');
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  const equipmentLevel = Math.max(fridgeLevel, keyboardLevel);
  const nextEquipmentCost = EQUIPMENT_UPGRADE_COSTS[equipmentLevel] ?? Infinity;
  const canUpgradeEquipment = equipmentLevel < 5 && gold >= nextEquipmentCost;
  const randomShardCost = getRandomActorShardPurchaseCost(randomShardPurchaseCount);
  const canBuyRandomShard = gold >= randomShardCost;
  const totalCost = selected ? selected.cost * quantity : 0;
  const canBuySelected = selected ? gold >= totalCost : false;

  useEffect(() => {
    setQuantity(1);
  }, [activeTab, selectedId]);

  const selectTab = (tab: ShopTab) => {
    setActiveTab(tab);
    const nextEntries = tab === 'snacks' ? snackEntries : battleEntries;
    setSelectedId(nextEntries[0]?.id ?? '');
  };

  const buySelected = () => {
    if (!selected) return;
    if (gold < totalCost) return;
    if (selected.kind === 'battle') {
      for (let index = 0; index < quantity; index += 1) {
        buyItem(selected.item.itemId, selected.cost);
      }
      return;
    }
    buyZogGiftById(selected.gift.giftId, quantity);
  };

  const handleBuyRandomShard = () => {
    const result = buyRandomActorShard();
    setShopToast(result ? result.toast : 'G 不够，随机碎片售货口拒绝吐票。');
  };

  const incrementQuantity = () => {
    if (!selected) return;
    const maxByGold = Math.max(1, Math.floor(gold / selected.cost));
    setQuantity((current) => Math.min(maxByGold, current + 1));
  };

  const decrementQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  return (
    <div className="shop-overlay" role="dialog" aria-modal="true" aria-label="商店浮层">
      <div
        className="shop-modal"
        style={{ width: STAGE_WIDTH * shopScale, height: STAGE_HEIGHT * shopScale }}
      >
        <div className="shop-stage" style={{ transform: `scale(${shopScale})` }}>
          <img className="shop-bg" alt="" src={SHOP_ASSETS.background} draggable={false} />
          <img className="shop-pendant" alt="" src={SHOP_ASSETS.pendant} draggable={false} style={box(82, 0, 181, 235)} />
          <img className="shop-float-decor" alt="" src={SHOP_ASSETS.floatDecor} draggable={false} style={box(632, 3, 198, 131)} />
          <img className="shop-swing-decor" alt="" src={SHOP_ASSETS.swingDecor} draggable={false} style={box(45, 955, 158, 121)} />
          <img className="shop-sign" alt="宇宙杂货店" src={SHOP_ASSETS.sign} draggable={false} style={box(253, 89, 379, 78)} />
          <ShopGlowPixiCanvas assets={SHOP_ASSETS} width={STAGE_WIDTH} height={STAGE_HEIGHT} />

          {(['battle', 'snacks', 'equipment'] as ShopTab[]).map((tab) => (
            <button
              className={`shop-tab${activeTab === tab ? ' is-active' : ''}`}
              key={tab}
              onClick={() => selectTab(tab)}
              style={TAB_LAYOUT[tab].base}
              type="button"
            >
              {activeTab === tab ? <img className="shop-tab-base" alt="" src={SHOP_ASSETS.greenTab} draggable={false} /> : null}
              <img className="shop-tab-icon" alt="" src={TAB_ART[tab].icon} draggable={false} style={TAB_LAYOUT[tab].icon} />
              <img className="shop-tab-text" alt={TAB_ART[tab].label} src={TAB_ART[tab].text} draggable={false} style={TAB_LAYOUT[tab].text} />
            </button>
          ))}

          <button className="shop-close" onClick={onBack} style={box(1323, 23, 93, 91)} type="button" aria-label="关闭商店">
            <img alt="" src={SHOP_ASSETS.close} draggable={false} />
          </button>

          <div className="shop-gold">
            <img alt="" src={SHOP_ASSETS.gold} draggable={false} />
            <strong>{gold.toLocaleString()}</strong>
          </div>

          {activeTab === 'equipment' ? (
            <EquipmentUpgradePanel
              canUpgrade={canUpgradeEquipment}
              equipmentLevel={equipmentLevel}
              canBuyRandomShard={canBuyRandomShard}
              randomShardCost={randomShardCost}
              randomShardPurchaseCount={randomShardPurchaseCount}
              shardToast={shopToast}
              nextCost={nextEquipmentCost}
              onBuyRandomShard={handleBuyRandomShard}
              onUpgrade={upgradeEquipment}
            />
          ) : (
            <>
              <section className="shop-catalog" style={box(135, 392, 715, 542)}>
                <div className="shop-item-grid">
                  {entries.map((entry) => (
                    <button
                      className={`shop-item-card${selected?.id === entry.id ? ' is-selected' : ''}`}
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      type="button"
                    >
                      <img className="shop-item-base" alt="" src={SHOP_ASSETS.itemBaseLarge} draggable={false} />
                      <span className="shop-item-name">{entry.name}</span>
                      {entry.iconFile ? <img className="shop-item-icon" alt="" src={itemIcon(entry.iconFile)} draggable={false} /> : null}
                      <span className="shop-item-price">
                        <b>售价：{entry.cost}</b>
                        <img alt="" src={SHOP_ASSETS.gold} draggable={false} />
                      </span>
                      <span className="shop-item-owned">x{entry.owned}</span>
                    </button>
                  ))}
                </div>
              </section>

              {selected ? (
                <ShopDetailPanel
                  canBuy={canBuySelected}
                  entry={selected}
                  onDecrement={decrementQuantity}
                  onIncrement={incrementQuantity}
                  onBuy={buySelected}
                  quantity={quantity}
                  totalCost={totalCost}
                />
              ) : null}
            </>
          )}

          <p className="shop-tip">
            买到的战斗补给和 Zog 零食都会进入背包。Zog 零食在冰箱送给 Zog 后才加好感。
          </p>
        </div>
      </div>
    </div>
  );
}

function ShopDetailPanel({
  canBuy,
  entry,
  onBuy,
  onDecrement,
  onIncrement,
  quantity,
  totalCost,
}: {
  canBuy: boolean;
  entry: ShopEntry;
  onBuy: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  quantity: number;
  totalCost: number;
}) {
  const isBattle = entry.kind === 'battle';
  const effect = isBattle ? entry.item.effectLabel : `+${entry.gift.affection}`;
  const secondaryLabel = isBattle ? '副作用' : '浮动数值';
  const secondaryValue = isBattle ? entry.item.sideEffectLabel : getZogGiftAffectionRange(entry.gift);
  const description = isBattle ? (BATTLE_DESCRIPTIONS[entry.item.itemId] ?? entry.item.description) : (SNACK_DESCRIPTIONS[entry.gift.giftId] ?? entry.gift.flavor);
  const owned = entry.owned;

  return (
    <section className="shop-detail" style={box(922, 360, 346, 590)}>
      <h2>{entry.name}</h2>
      <img className="shop-detail-icon" alt="" src={itemIcon(entry.iconFile)} draggable={false} />
      <div className="shop-detail-stats">
        <div>
          <strong>基础作用</strong>
          <span>{effect}</span>
        </div>
        <div>
          <strong>{secondaryLabel}</strong>
          <span>{secondaryValue}</span>
        </div>
      </div>
      <p className="shop-detail-description">{description}</p>
      <div className="shop-buy-row">
        <strong>库存 / 单价：</strong>
        <span>已有x{owned} / {entry.cost}</span>
        <img alt="" src={SHOP_ASSETS.gold} draggable={false} />
      </div>
      <div className="shop-quantity-row">
        <button type="button" aria-label="减少" onClick={onDecrement}>-</button>
        <span>{quantity}</span>
        <button type="button" aria-label="增加" onClick={onIncrement}>+</button>
      </div>
      <button className="shop-buy-button" disabled={!canBuy} onClick={onBuy} type="button">
        <img alt="" src={SHOP_ASSETS.buy} draggable={false} />
        <span>
          {totalCost}
          <img alt="" src={SHOP_ASSETS.gold} draggable={false} />
          购买
        </span>
      </button>
      {!canBuy ? <div className="shop-not-enough">金币不足！</div> : null}
    </section>
  );
}

function EquipmentUpgradePanel({
  canBuyRandomShard,
  canUpgrade,
  equipmentLevel,
  nextCost,
  onBuyRandomShard,
  onUpgrade,
  randomShardCost,
  randomShardPurchaseCount,
  shardToast,
}: {
  canBuyRandomShard: boolean;
  canUpgrade: boolean;
  equipmentLevel: number;
  nextCost: number;
  onBuyRandomShard: () => void;
  onUpgrade: () => void;
  randomShardCost: number;
  randomShardPurchaseCount: number;
  shardToast: string | null;
}) {
  return (
    <section className="shop-equipment-panel" style={box(144, 392, 1124, 542)}>
      <h2>设备升级</h2>
      <div className="shop-tech-placeholder">
        <div>
          <strong>共享设备 Lv.{equipmentLevel}</strong>
          <p>战斗道具每局可用 {FRIDGE_USES[equipmentLevel]} 次，临场输入上限 {KEYBOARD_LIMITS[equipmentLevel]} 字。</p>
          {equipmentLevel < 5 ? (
            <p>下一等级：每局 {FRIDGE_USES[equipmentLevel + 1]} 次 / {KEYBOARD_LIMITS[equipmentLevel + 1]} 字。</p>
          ) : (
            <p>设备已经升到当前最高等级。</p>
          )}
        </div>
        <button disabled={!canUpgrade} onClick={onUpgrade} type="button">
          {equipmentLevel >= 5 ? 'MAX' : <>升级 <CurrencyAmount value={nextCost} variant="gold" /></>}
        </button>
      </div>
      <div className="shop-tech-placeholder" style={{ marginTop: 18 }}>
        <div>
          <strong>随机演员合同碎片</strong>
          <p>从全部演员里随机获得 1 个绑定合同碎片。购买次数越多越贵，不重置。</p>
          <p>已购买 {randomShardPurchaseCount} 次，下一次价格 {randomShardCost}G。</p>
          {shardToast ? <p style={{ color: '#1c7f57', fontWeight: 800 }}>{shardToast}</p> : null}
        </div>
        <button disabled={!canBuyRandomShard} onClick={onBuyRandomShard} type="button">
          购买 <CurrencyAmount value={randomShardCost} variant="gold" />
        </button>
      </div>
    </section>
  );
}

function box(left: number, top: number, width: number, height: number): CSSProperties {
  return { left, top, width, height };
}

function useShopScale(): number {
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return 0.6;
    return getShopScale(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const update = () => setScale(getShopScale(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}

function getShopScale(viewportWidth: number, viewportHeight: number): number {
  return Math.min(1, (viewportWidth * 0.6) / STAGE_WIDTH, (viewportHeight * 0.92) / STAGE_HEIGHT);
}
