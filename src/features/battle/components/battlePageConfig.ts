/**
 * 功能备注：战斗页静态配置中心。
 * 放舞台尺寸、素材路径、Figma 坐标盒、速度按钮和 Tab/道具槽布局，方便后续集中调位置。
 */
import type { CSSProperties } from 'react';
import { assetPath as gameAssetPath } from '../../../shared/game-ui';
import type { BattleLogTab } from './battleUiTypes';

export const BATTLE_STAGE = {
  width: 2048,
  height: 1143,
} as const;

export const BATTLE_ASSETS = {
  background: gameAssetPath('battleReact', 'bg.png'),
  title: gameAssetPath('battleReact', 'title.png'),
  close: gameAssetPath('battleReact', 'close.png'),
  send: gameAssetPath('battleReact', 'send.png'),
  speedIdle: gameAssetPath('battleReact', 'speed-idle.png'),
  speedActive: gameAssetPath('battleReact', 'speed-active.png'),
  pause: gameAssetPath('battleReact', 'pause.png'),
  resume: gameAssetPath('battleReact', 'resume.png'),
  stepAutoIdle: gameAssetPath('battleReact', 'step-auto-idle.png'),
  stepAutoActive: gameAssetPath('battleReact', 'step-auto-active.png'),
  tabIdle: gameAssetPath('battleReact', 'tab-idle.png'),
  tabActive: gameAssetPath('battleReact', 'tab-active.png'),
  itemButton: gameAssetPath('battleReact', 'item-button.png'),
  allRecords: gameAssetPath('battleReact', 'all-records.png'),
  filter: gameAssetPath('battleReact', 'filter.png'),
  settings: gameAssetPath('battleReact', 'settings.png'),
  reportCard: gameAssetPath('battleReact', 'report-card.png'),
  avatarPlaceholder: gameAssetPath('battleReact', 'avatar-placeholder.png'),
} as const;

// Figma coordinates are mapped from a 4096px design export into this 2048px React stage.
export const PIXI_BOX = box(103.5, 155, 1421, 644.5);

export const TOP_FIELDS = {
  action: box(530, 70, 160, 64),
  alive: box(747, 70, 165, 64),
  wild: box(970, 70, 190, 64),
} as const;

export const SPEED_BUTTONS = [
  { label: '1X', ms: 500, activeBox: box(1274, 31.5, 69.5, 49.5), idleBox: box(1278.25, 28, 61, 56.5), activeAsset: BATTLE_ASSETS.speedActive, idleAsset: BATTLE_ASSETS.speedIdle },
  { label: '2X', ms: 250, activeBox: box(1339.25, 31.5, 69.5, 49.5), idleBox: box(1343.5, 28, 61, 56.5), activeAsset: BATTLE_ASSETS.speedActive, idleAsset: BATTLE_ASSETS.speedIdle },
  { label: '4X', ms: 125, activeBox: box(1406.75, 31.5, 69.5, 49.5), idleBox: box(1411, 28, 61, 56.5), activeAsset: BATTLE_ASSETS.speedActive, idleAsset: BATTLE_ASSETS.speedIdle },
] as const;

export const RUN_BUTTON_BOX = box(1472, 26, 111.5, 66.5);

export const MODE_BUTTONS = {
  manual: box(1581, 27.5, 82, 60),
  auto: box(1672, 29.5, 82, 59.5),
} as const;

export const LOG_TABS: { key: BattleLogTab; label: string; box: CSSProperties }[] = [
  { key: 'log', label: '详细日志', box: box(126, 876, 185, 40.5) },
  { key: 'director', label: '导演和快报', box: box(332, 876, 185, 40.5) },
  { key: 'reporter', label: '战地记者', box: box(538, 876, 185, 40.5) },
];

export const ITEM_SLOT_BOXES = [
  box(1618, 990, 45.5, 43.5),
  box(1676, 990, 45.5, 43.5),
  box(1734, 990, 45.5, 43.5),
  box(1618, 1042, 45.5, 43.5),
  box(1676, 1042, 45.5, 43.5),
  box(1734, 1042, 45.5, 43.5),
] as const;

export function box(left: number, top: number, width: number, height: number): CSSProperties {
  return { position: 'absolute', left, top, width, height };
}
