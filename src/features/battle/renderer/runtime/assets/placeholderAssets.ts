/**
 * placeholderAssets - 占位资源定义
 *
 * 本阶段使用占位图形、纯色块、文字标签、简单粒子
 * 后续批量替换美术资源时，只需要改资源和 sprite 实现，不需要再碰战斗逻辑
 */

import { registerAsset } from './assetRegistry';

export function registerPlaceholderAssets(): void {
  // 角色占位
  registerAsset({ key: 'actor_placeholder', path: '', type: 'sprite' });

  // 渡渡鸟占位
  registerAsset({ key: 'dodo_placeholder', path: '', type: 'sprite' });

  // 状态图标占位
  registerAsset({ key: 'status_placeholder', path: '', type: 'sprite' });

  // 道具图标占位
  registerAsset({ key: 'item_placeholder', path: '', type: 'sprite' });

  console.info('[placeholderAssets] Registered placeholder asset keys');
}
