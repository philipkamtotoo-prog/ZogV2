import { useEffect, useState } from 'react';
import { LoungePixiCanvas } from '../renderer/LoungePixiCanvas';
import { useLoungeStore } from '../loungeStore';
import { DEFAULT_ROSTER } from '../../actors/actorRoster';
import { CurrencyAmount, CurrencyDisplay, FixedStage, assetPath as gameAssetPath } from '../../../shared/game-ui';
import { ZogFridgePanel } from './ZogFridgePanel';

interface LoungePageProps {
  onEnterTV: () => void;
  onOpenBackpack: () => void;
  onOpenShop: () => void;
  onOpenReports: () => void;
  onOpenRoster: () => void;
  onOpenSettings: () => void;
  onOpenGacha: () => void;
  shopActive?: boolean;
}

const SCENE_WIDTH = 2162;
const SCENE_HEIGHT = 1216;

const asset = (file: string) => gameAssetPath('hub', file);

interface LayerConfig {
  key: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  zIndex: number;
}

interface HotspotConfig {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  onClick: () => void;
  label: string;
}

const decorativeLayers: LayerConfig[] = [
  { key: 'background', src: asset('livingroombg.png'), left: 0, top: 0, width: 2162, height: 1216, zIndex: 1 },
  { key: 'clock', src: asset('deco-clock-1.png'), left: 16, top: 332, width: 166, height: 207, zIndex: 2 },
  { key: 'frame-1', src: asset('deco-frame-1.png'), left: 512, top: 125, width: 223, height: 287, zIndex: 2 },
  { key: 'frame-2', src: asset('deco-frame-2.png'), left: 809, top: 37, width: 329, height: 291, zIndex: 2 },
  { key: 'frame-3', src: asset('deco-frame-3.png'), left: 1183, top: 78, width: 277, height: 323, zIndex: 2 },
  { key: 'fridge', src: asset('livingroom-fr-2.png'), left: 130, top: 225, width: 483, height: 758, zIndex: 3 },
  { key: 'tv', src: asset('livingroom-tv-2.png'), left: 1508, top: 324, width: 546, height: 670, zIndex: 3 },
  { key: 'sofa', src: asset('livingroom-sofa-1.png'), left: 648, top: 450, width: 825, height: 451, zIndex: 4 },
  { key: 'zog', src: asset('zog.png'), left: 917, top: 509, width: 289, height: 555, zIndex: 5 },
  { key: 'plant', src: asset('deco-plant-1.png'), left: -32, top: 985, width: 282, height: 290, zIndex: 6 },
  { key: 'money-plate', src: asset('\u5de6\u4e0a\u89d2icon.png'), left: 106, top: -19, width: 289, height: 343, zIndex: 7 },
  { key: 'top-plate', src: asset('\u53f3\u4e0a\u89d2\u94c1\u76ae\u724c.png'), left: 1532, top: 8, width: 628, height: 372, zIndex: 7 },
  { key: 'icon-chain', src: asset('\u6302icon\u7684\u94fe\u6761.png'), left: 1637, top: 2, width: 439, height: 152, zIndex: 8 },
  { key: 'broker-icon', src: asset('\u7ecf\u7eaa\u4ebaicon.png'), left: 1595, top: 86, width: 116, height: 144, zIndex: 9 },
  { key: 'backpack-icon', src: asset('\u80cc\u5305icon.png'), left: 1757, top: 116, width: 94, height: 99, zIndex: 9 },
  { key: 'shop-icon-fallback', src: asset('\u5546\u5e97icon.png'), left: 1878, top: 77, width: 122, height: 167, zIndex: 8 },
  { key: 'settings-icon', src: asset('\u8bbe\u7f6eicon.png'), left: 2004, top: 104, width: 103, height: 114, zIndex: 9 },
  { key: 'settings-label-mark', src: asset('\u8bbe\u7f6e\u94ed\u724c.png'), left: 2000, top: 190, width: 124, height: 101, rotate: 43.8, zIndex: 10 },
  { key: 'settings-label', src: asset('settings.png'), left: 2004, top: 200.01, width: 105, height: 78, rotate: 39.27, zIndex: 11 },
  { key: 'broker-name', src: asset("Broker's  office_.png"), left: 1573, top: 224, width: 164, height: 91, zIndex: 10 },
  { key: 'bag-name', src: asset('BAG.png'), left: 1742, top: 220, width: 125, height: 51, zIndex: 10 },
  { key: 'shop-name', src: asset('ShOp.png'), left: 1872, top: 270, width: 127, height: 57, zIndex: 10 },
];

export function LoungePage({
  onEnterTV,
  onOpenBackpack,
  onOpenShop,
  onOpenReports,
  onOpenRoster,
  onOpenSettings,
  onOpenGacha,
  shopActive = false,
}: LoungePageProps) {
  const gold = useLoungeStore((s) => s.gold);
  const zogAffection = useLoungeStore((s) => s.zogAffection);
  const actorSalary = useLoungeStore((s) => s.actorSalary);
  const collectIdleIncome = useLoungeStore((s) => s.collectIdleIncome);
  const addGold = useLoungeStore((s) => s.addGold);
  const addActorSalary = useLoungeStore((s) => s.addActorSalary);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [isZogFridgeOpen, setIsZogFridgeOpen] = useState(false);

  useEffect(() => {
    collectIdleIncome();
  }, [collectIdleIncome]);

  const hotspots: HotspotConfig[] = [
    { key: 'fridge', left: 130, top: 225, width: 483, height: 758, onClick: () => setIsZogFridgeOpen(true), label: '和 Zog 交流' },
    { key: 'tv', left: 1508, top: 324, width: 546, height: 670, onClick: onEnterTV, label: '进入电视' },
    { key: 'reports', left: 106, top: -19, width: 289, height: 343, onClick: onOpenReports, label: '打开战报' },
    { key: 'broker', left: 1573, top: 86, width: 164, height: 229, onClick: onOpenRoster, label: '打开经纪人' },
    { key: 'backpack', left: 1742, top: 116, width: 125, height: 155, onClick: onOpenBackpack, label: '打开背包' },
    { key: 'shop', left: 1872, top: 77, width: 128, height: 250, onClick: onOpenShop, label: '打开商店' },
    { key: 'settings', left: 2009, top: 77, width: 175, height: 209, onClick: onOpenSettings, label: '打开设置' },
    { key: 'plant', left: -32, top: 985, width: 282, height: 290, onClick: onOpenGacha, label: '打开经纪人扭蛋盆栽' },
  ];

  const totalSalary = Object.values(actorSalary).reduce((sum, value) => sum + value, 0);

  const handleCheatResources = () => {
    addGold(5000);
    DEFAULT_ROSTER.forEach((actor) => addActorSalary(actor.actorId, 300));
  };

  const handleHotspotClick = (hotspot: HotspotConfig) => {
    setHoveredHotspot(null);
    hotspot.onClick();
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#140d07',
      }}
    >
      <FixedStage fit="cover" height={SCENE_HEIGHT} width={SCENE_WIDTH}>
            {decorativeLayers.map((layer) => (
              <SceneLayer key={layer.key} layer={layer} hoveredHotspot={hoveredHotspot} />
            ))}

            <LoungePixiCanvas
              width={SCENE_WIDTH}
              height={SCENE_HEIGHT}
              shopHovered={hoveredHotspot === 'shop' || shopActive}
            />

            <div
              style={{
                position: 'absolute',
                left: 128,
                top: 118,
                width: 246,
                zIndex: 12,
                color: '#1a140f',
                textAlign: 'center',
                textShadow: '0 1px 0 rgba(255, 244, 220, 0.45)',
                fontFamily: '"Trebuchet MS", "Arial Rounded MT Bold", sans-serif',
                letterSpacing: '0.04em',
              }}
            >
              <CurrencyDisplay
                label="金币"
                value={gold}
                variant="gold"
                style={{ justifyContent: 'center', fontSize: 24, fontWeight: 800 }}
                valueClassName="lounge-currency-value"
              />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 122,
                top: 230,
                width: 250,
                zIndex: 12,
                color: '#efe7da',
                textAlign: 'center',
                textShadow: '0 1px 0 rgba(0, 0, 0, 0.32)',
                fontFamily: '"Trebuchet MS", "Arial Rounded MT Bold", sans-serif',
                letterSpacing: '0.04em',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800 }}>Zog 好感度</div>
              <div style={{ marginTop: 8, fontSize: 44, fontWeight: 900 }}>{zogAffection.toLocaleString()}</div>
              <CurrencyDisplay
                label="S币合计"
                value={totalSalary}
                variant="scoin"
                style={{ justifyContent: 'center', marginTop: 8, fontSize: 22, fontWeight: 800 }}
              />
            </div>

            {hotspots.map((hotspot) => (
              <button
                key={hotspot.key}
                onClick={() => handleHotspotClick(hotspot)}
                onMouseEnter={() => setHoveredHotspot(hotspot.key)}
                onMouseLeave={() => setHoveredHotspot((current) => (current === hotspot.key ? null : current))}
                aria-label={hotspot.label}
                title={hotspot.label}
                style={{
                  position: 'absolute',
                  left: hotspot.left,
                  top: hotspot.top,
                  width: hotspot.width,
                  height: hotspot.height,
                  zIndex: 20,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
      </FixedStage>

      <button
        onClick={handleCheatResources}
        style={{
          position: 'absolute',
          left: 18,
          bottom: 18,
          zIndex: 80,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '10px 14px',
          border: '1px solid rgba(255, 223, 142, 0.42)',
          background: 'rgba(32, 16, 20, 0.9)',
          color: '#ffdf8e',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: 13,
        }}
      >
        Cheat +<CurrencyAmount value={5000} variant="gold" /> / 全员 +<CurrencyAmount value={300} variant="scoin" />
      </button>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 50,
          backgroundImage: [
            'radial-gradient(circle at center, rgba(255, 255, 255, 0.02) 0%, rgba(0, 0, 0, 0.16) 100%)',
            'repeating-linear-gradient(0deg, rgba(34, 18, 8, 0.18) 0px, rgba(34, 18, 8, 0.18) 1px, transparent 1px, transparent 4px)',
          ].join(', '),
          mixBlendMode: 'multiply',
          opacity: 0.72,
        }}
      />

      {isZogFridgeOpen && <ZogFridgePanel onClose={() => setIsZogFridgeOpen(false)} />}
    </div>
  );
}

function SceneLayer({
  layer,
  hoveredHotspot,
}: {
  layer: LayerConfig;
  hoveredHotspot: string | null;
}) {
  const isSettingsLayer =
    layer.key === 'settings-icon' ||
    layer.key === 'settings-label-mark' ||
    layer.key === 'settings-label';
  const isHovered =
    (hoveredHotspot === 'fridge' && layer.key === 'fridge') ||
    (hoveredHotspot === 'tv' && layer.key === 'tv') ||
    (hoveredHotspot === 'broker' && layer.key === 'broker-icon') ||
    (hoveredHotspot === 'backpack' && layer.key === 'backpack-icon') ||
    (hoveredHotspot === 'shop' && layer.key === 'shop-icon-fallback') ||
    (hoveredHotspot === 'plant' && layer.key === 'plant') ||
    (hoveredHotspot === 'settings' && isSettingsLayer);
  const transformParts = [];
  if (layer.rotate) {
    transformParts.push(`rotate(${layer.rotate}deg)`);
  }
  if (isHovered) {
    transformParts.push('scale(1.04)');
  }

  return (
    <img
      src={layer.src}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        position: 'absolute',
        left: layer.left,
        top: layer.top,
        width: layer.width,
        height: layer.height,
        zIndex: layer.zIndex,
        userSelect: 'none',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        transform: transformParts.length > 0 ? transformParts.join(' ') : undefined,
        transformOrigin: 'center center',
        filter: isHovered
          ? isSettingsLayer
            ? 'brightness(1.14) saturate(1.08) drop-shadow(0 0 24px rgba(197, 255, 142, 0.72))'
            : 'brightness(1.08) drop-shadow(0 0 18px rgba(255, 255, 255, 0.22))'
          : undefined,
        transition: 'transform 160ms ease, filter 160ms ease',
      }}
    />
  );
}
