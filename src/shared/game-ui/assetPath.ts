export const GAME_ASSET_BASES = {
  battleReact: '/battle-react/',
  brokerOffice: '/brokeroffice/',
  backpackOverlay: '/背包浮层/',
  settingsOverlay: '/设置浮层/',
  hub: '/hub/',
  itemIcons: '/道具icon/',
} as const;

export type GameAssetBase = keyof typeof GAME_ASSET_BASES;

export function assetPath(base: GameAssetBase, fileName: string): string {
  return `${GAME_ASSET_BASES[base]}${encodeURIComponent(fileName)}`;
}
