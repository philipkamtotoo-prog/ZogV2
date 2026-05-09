import {
  AnimatedSprite,
  Assets,
  Container,
  Spritesheet,
  Texture,
  type SpritesheetData,
} from 'pixi.js';
import { GlowFilter } from 'pixi-filters/glow';

const SHOP_ICON_LEFT = 1878;
const SHOP_ICON_TOP = 77;
const SHOP_ICON_WIDTH = 122;
const SHOP_ICON_HEIGHT = 167;
const SHOP_SHEET_JSON_URL = '/hub/\u5546\u5e97icon\u7cbe\u7075json/\u5546\u5e97icon.json';
const SHOP_SHEET_IMAGE_URL = '/hub/\u5546\u5e97icon\u7cbe\u7075json/\u5546\u5e97icon\u6574.png';

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

export class LoungeScene {
  readonly stage: Container;

  private width: number;
  private height: number;
  private shopContainer: Container;
  private shopAnimation: AnimatedSprite | null = null;
  private shopGlowAnimation: AnimatedSprite | null = null;
  private shopGlowFilter: GlowFilter | null = null;
  private shopSpritesheet: Spritesheet | null = null;
  private initialized = false;

  constructor(stage: Container, width: number, height: number) {
    this.stage = stage;
    this.width = width;
    this.height = height;
    this.stage.sortableChildren = true;

    this.shopContainer = new Container();
    this.shopContainer.zIndex = 9;
    this.shopContainer.position.set(
      SHOP_ICON_LEFT + SHOP_ICON_WIDTH / 2,
      SHOP_ICON_TOP + SHOP_ICON_HEIGHT / 2
    );
    this.stage.addChild(this.shopContainer);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const [jsonData, sheetTexture] = await Promise.all([
      fetch(SHOP_SHEET_JSON_URL).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load shop spritesheet json: ${response.status}`);
        }
        return response.json() as Promise<TexturePackerData>;
      }),
      Assets.load<Texture>(SHOP_SHEET_IMAGE_URL),
    ]);

    if (this.initialized) return;

    const spritesheetData: TexturePackerData = {
      ...jsonData,
      meta: {
        ...jsonData.meta,
        image: SHOP_SHEET_IMAGE_URL,
      },
    };

    const spritesheet = new Spritesheet(sheetTexture.source, spritesheetData);
    await spritesheet.parse();

    const frameTextures = Object.entries(spritesheet.textures)
      .sort(([leftKey], [rightKey]) => extractFrameNumber(leftKey) - extractFrameNumber(rightKey))
      .map(([, texture]) => texture);

    if (frameTextures.length === 0) {
      throw new Error('Shop spritesheet parsed without frames.');
    }

    const animation = new AnimatedSprite(frameTextures);
    const glowAnimation = new AnimatedSprite(frameTextures);
    const scale = Math.min(
      SHOP_ICON_WIDTH / animation.texture.width,
      SHOP_ICON_HEIGHT / animation.texture.height
    );
    const glowFilter = new GlowFilter({
      distance: 30,
      outerStrength: 8.5,
      innerStrength: 1.6,
      color: 0xb8ff6a,
      alpha: 0.72,
      quality: 0.35,
      knockout: false,
    });
    glowFilter.padding = 56;

    glowAnimation.anchor.set(0.5);
    glowAnimation.scale.set(scale);
    glowAnimation.animationSpeed = 0.22;
    glowAnimation.loop = true;
    glowAnimation.alpha = 0.88;
    glowAnimation.tint = 0xd8ff93;
    glowAnimation.blendMode = 'add';
    glowAnimation.filters = [glowFilter];
    glowAnimation.play();

    animation.anchor.set(0.5);
    animation.scale.set(scale);
    animation.animationSpeed = 0.22;
    animation.loop = true;
    animation.play();

    this.shopGlowAnimation = glowAnimation;
    this.shopAnimation = animation;
    this.shopGlowFilter = glowFilter;
    this.shopSpritesheet = spritesheet;

    this.shopContainer.addChild(glowAnimation);
    this.shopContainer.addChild(animation);
    this.initialized = true;
    this.resize(this.width, this.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.shopContainer.position.set(
      SHOP_ICON_LEFT + SHOP_ICON_WIDTH / 2,
      SHOP_ICON_TOP + SHOP_ICON_HEIGHT / 2
    );
  }

  setShopHover(hovered: boolean): void {
    this.shopContainer.scale.set(hovered ? 1.08 : 1);

    if (this.shopGlowFilter) {
      this.shopGlowFilter.outerStrength = hovered ? 11.5 : 8.5;
      this.shopGlowFilter.innerStrength = hovered ? 2.3 : 1.6;
      this.shopGlowFilter.distance = hovered ? 36 : 30;
      this.shopGlowFilter.alpha = hovered ? 0.92 : 0.72;
    }

    if (this.shopGlowAnimation) {
      this.shopGlowAnimation.alpha = hovered ? 1 : 0.88;
    }
  }

  destroy(): void {
    this.stage.removeChildren();
    this.shopAnimation?.destroy();
    this.shopGlowAnimation?.destroy();
    this.shopContainer.destroy();
    this.shopSpritesheet?.destroy(false);
    this.shopAnimation = null;
    this.shopGlowAnimation = null;
    this.shopGlowFilter = null;
    this.shopSpritesheet = null;
    this.initialized = false;
  }
}

function extractFrameNumber(frameName: string): number {
  const match = frameName.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
