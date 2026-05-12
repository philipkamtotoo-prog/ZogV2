export const GAME_ASSET_BASES = {
  battleReact: '/battle-react/',
  brokerOffice: '/brokeroffice/',
  hub: '/hub/',
} as const;

export type GameAssetBase = keyof typeof GAME_ASSET_BASES;

export function assetPath(base: GameAssetBase, fileName: string): string {
  return `${GAME_ASSET_BASES[base]}${encodeURIComponent(fileName)}`;
}

