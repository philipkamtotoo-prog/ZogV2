import {
  AnimatedSprite,
  Assets,
  Container,
  Spritesheet,
  Texture,
  type SpritesheetData,
} from 'pixi.js';
import {
  getActorAnimationArt,
  getActorInteractiveAnimationKeys,
  type ActorAnimationArt,
  type ActorAnimationKey,
} from '../actorArtRegistry';

interface TexturePackerFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

interface TexturePackerData extends SpritesheetData {
  frames: Record<string, TexturePackerFrame>;
  meta: SpritesheetData['meta'] & { image: string };
}

export class BrokerActorPortraitScene {
  private readonly stage: Container;
  private width: number;
  private height: number;
  private actorLayer: Container;
  private animation: AnimatedSprite | null = null;
  private spritesheet: Spritesheet | null = null;
  private currentArt: ActorAnimationArt | null = null;
  private currentActorId: string | null = null;
  private loadVersion = 0;
  private destroyed = false;

  constructor(stage: Container, width: number, height: number) {
    this.stage = stage;
    this.width = width;
    this.height = height;
    this.actorLayer = new Container();
    this.actorLayer.sortableChildren = true;
    this.stage.addChild(this.actorLayer);
  }

  async showActor(actorId: string | null | undefined): Promise<void> {
    this.currentActorId = actorId ?? null;
    await this.playAnimation(actorId, 'idle', true);
  }

  async playRandomInteractiveAction(actorId: string | null | undefined): Promise<void> {
    if (!actorId || actorId !== this.currentActorId) return;

    const actionKeys = getActorInteractiveAnimationKeys(actorId);
    if (actionKeys.length === 0) return;

    const actionKey = actionKeys[Math.floor(Math.random() * actionKeys.length)];
    await this.playAnimation(actorId, actionKey, false);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.animation && this.currentArt) {
      this.positionAnimation(this.currentArt, this.animation);
    }
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.loadVersion += 1;
    this.clearActor();
    this.spritesheet?.destroy(false);
    this.spritesheet = null;
    this.actorLayer.destroy({ children: true });
  }

  private async playAnimation(
    actorId: string | null | undefined,
    animationKey: ActorAnimationKey,
    shouldLoop: boolean,
  ): Promise<void> {
    const art = getActorAnimationArt(actorId, animationKey);
    const version = this.loadVersion + 1;
    this.loadVersion = version;

    if (!art || this.destroyed) {
      this.clearActor();
      return;
    }

    const { animation, spritesheet } = await this.loadAnimation(art, shouldLoop);

    if (this.destroyed || version !== this.loadVersion) {
      animation.destroy();
      spritesheet.destroy(false);
      return;
    }

    this.clearActor();
    this.spritesheet?.destroy(false);
    this.spritesheet = spritesheet;
    this.currentArt = art;
    this.animation = animation;
    this.actorLayer.addChild(animation);
    this.positionAnimation(art, animation);

    if (!shouldLoop) {
      animation.onComplete = () => {
        if (!this.destroyed && version === this.loadVersion) {
          void this.showActor(actorId);
        }
      };
    }

    animation.play();
  }

  private async loadAnimation(
    art: ActorAnimationArt,
    shouldLoop: boolean,
  ): Promise<{ animation: AnimatedSprite; spritesheet: Spritesheet }> {
    const [jsonData, sheetTexture] = await Promise.all([
      fetch(art.jsonUrl).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load actor spritesheet json: ${response.status} ${art.jsonUrl}`);
        }
        return response.json() as Promise<TexturePackerData>;
      }),
      Assets.load<Texture>(art.sheetUrl),
    ]);

    const spritesheetData: TexturePackerData = {
      ...jsonData,
      meta: {
        ...jsonData.meta,
        image: art.sheetUrl,
      },
    };

    const spritesheet = new Spritesheet(sheetTexture.source, spritesheetData);
    await spritesheet.parse();

    const textures = Object.entries(spritesheet.textures)
      .sort(([leftKey], [rightKey]) => extractFrameNumber(leftKey) - extractFrameNumber(rightKey))
      .map(([, texture]) => texture);

    if (textures.length === 0) {
      spritesheet.destroy(false);
      throw new Error(`Actor spritesheet parsed without frames: ${art.jsonUrl}`);
    }

    const animation = new AnimatedSprite(textures);
    animation.anchor.set(art.anchor.x, art.anchor.y);
    animation.animationSpeed = art.fps / 60;
    animation.loop = shouldLoop && art.loop;

    return { animation, spritesheet };
  }

  private positionAnimation(art: ActorAnimationArt, animation: AnimatedSprite): void {
    const fitScale = Math.min(
      art.brokerPortrait.maxWidth / art.sourceSize.width,
      art.brokerPortrait.maxHeight / art.sourceSize.height,
    );

    animation.scale.set(fitScale * art.brokerPortrait.scale);
    animation.position.set(
      Math.min(this.width, art.brokerPortrait.x),
      Math.min(this.height, art.brokerPortrait.y),
    );
  }

  private clearActor(): void {
    this.animation?.destroy();
    this.animation = null;
    this.currentArt = null;
    this.actorLayer.removeChildren();
  }
}

function extractFrameNumber(frameName: string): number {
  const match = frameName.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
