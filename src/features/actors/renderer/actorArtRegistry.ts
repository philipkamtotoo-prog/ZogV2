export type ActorAnimationKey = 'idle' | 'attack' | 'dead';

export interface ActorAnimationArt {
  actorId: string;
  animationKey: ActorAnimationKey;
  jsonUrl: string;
  sheetUrl: string;
  manifestUrl?: string;
  fps: number;
  loop: boolean;
  anchor: {
    x: number;
    y: number;
  };
  sourceSize: {
    width: number;
    height: number;
  };
  brokerPortrait: {
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    scale: number;
  };
}

export interface ActorArtDefinition {
  actorId: string;
  animations: Partial<Record<ActorAnimationKey, ActorAnimationArt>>;
}

const actorAsset = (path: string): string =>
  `/\u89d2\u8272/${path.split('/').map((part) => encodeURIComponent(part)).join('/')}`;

export const ACTOR_ART_REGISTRY: Record<string, ActorArtDefinition> = {
  astro_toad: {
    actorId: 'astro_toad',
    animations: {
      idle: {
        actorId: 'astro_toad',
        animationKey: 'idle',
        jsonUrl: actorAsset('astro_toad/idle/astro_toad_idle.json'),
        sheetUrl: actorAsset('astro_toad/idle/astro_toad_idle.png'),
        manifestUrl: actorAsset('astro_toad/idle/astro_toad_idle.manifest.json'),
        fps: 12,
        loop: true,
        anchor: { x: 0.5, y: 1 },
        sourceSize: { width: 512, height: 640 },
        brokerPortrait: {
          x: 318,
          y: 805,
          maxWidth: 560,
          maxHeight: 760,
          scale: 0.98,
        },
      },
      attack: {
        actorId: 'astro_toad',
        animationKey: 'attack',
        jsonUrl: actorAsset('astro_toad/attack/astro_toad_attack.json'),
        sheetUrl: actorAsset('astro_toad/attack/astro_toad_attack.png'),
        manifestUrl: actorAsset('astro_toad/attack/astro_toad_attack.manifest.json'),
        fps: 12,
        loop: false,
        anchor: { x: 0.5, y: 1 },
        sourceSize: { width: 512, height: 640 },
        brokerPortrait: {
          x: 318,
          y: 805,
          maxWidth: 560,
          maxHeight: 760,
          scale: 0.98,
        },
      },
    },
  },
};

export function getActorAnimationArt(
  actorId: string | null | undefined,
  animationKey: ActorAnimationKey,
): ActorAnimationArt | null {
  if (!actorId) return null;
  return ACTOR_ART_REGISTRY[actorId]?.animations[animationKey] ?? null;
}

export function hasActorArt(actorId: string | null | undefined): boolean {
  if (!actorId) return false;
  return Boolean(ACTOR_ART_REGISTRY[actorId]);
}

export function getActorInteractiveAnimationKeys(actorId: string | null | undefined): ActorAnimationKey[] {
  if (!actorId) return [];

  const animations = ACTOR_ART_REGISTRY[actorId]?.animations;
  if (!animations) return [];

  return (Object.keys(animations) as ActorAnimationKey[]).filter((key) => key !== 'idle' && key !== 'dead');
}
