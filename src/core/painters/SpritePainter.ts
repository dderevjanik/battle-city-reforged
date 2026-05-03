import { Sprite } from '../graphics/Sprite';

/**
 * Origin presets matching the legacy SpriteAlignment values, expressed as
 * Phaser-style normalized origin coordinates (0..1).
 */
export const SpriteOrigin = {
  TopLeft: { x: 0, y: 0 },
  MiddleLeft: { x: 0, y: 0.5 },
  MiddleCenter: { x: 0.5, y: 0.5 },
} as const;

export class SpritePainter {
  public readonly kind = 'sprite' as const;
  public sprite: Sprite | null = null;
  public opacity = 1;
  /** Origin point inside the sprite (0..1) — also where it anchors in its
   *  parent container. {0,0} = top-left, {0.5,0.5} = center. */
  public originX: number;
  public originY: number;
  /** When true, the sprite scales to fill its GameObject's bounding box and
   *  origin/destinationRect are ignored. */
  public stretch: boolean;

  constructor(
    sprite: Sprite | null = null,
    origin: { x: number; y: number } = SpriteOrigin.MiddleCenter,
    stretch = false,
  ) {
    this.sprite = sprite;
    this.originX = origin.x;
    this.originY = origin.y;
    this.stretch = stretch;
  }
}
