/**
 * assetRegistry - 资源路径统一管理
 *
 * 规则：所有资源路径统一走 registry，不允许在 sprite 组件里硬编码路径
 * 后续替换正式美术资源时，只需修改这里
 */

export type AssetKey = string;

interface AssetEntry {
  key: AssetKey;
  path: string;
  type: 'sprite' | 'animation' | 'image';
}

const REGISTRY: AssetEntry[] = [];

// 注册资源
export function registerAsset(entry: AssetEntry): void {
  const existing = REGISTRY.find((r) => r.key === entry.key);
  if (existing) {
    console.warn(`[assetRegistry] Asset ${entry.key} already registered, skipping`);
    return;
  }
  REGISTRY.push(entry);
}

// 获取资源路径
export function getAssetPath(key: AssetKey): string | undefined {
  return REGISTRY.find((r) => r.key === key)?.path;
}

// 获取所有资源
export function getAllAssets(): AssetEntry[] {
  return [...REGISTRY];
}

// 预加载所有资源（返回 Promise）
export async function preloadAllAssets(): Promise<void> {
  // 占位：后续替换正式美术时实现
  return Promise.resolve();
}

// 清理注册表
export function clearRegistry(): void {
  REGISTRY.length = 0;
}
