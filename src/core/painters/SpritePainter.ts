import { Sprite } from '../graphics/Sprite';
import { SpriteAlignment } from '../SpriteAlignment';

export class SpritePainter {
  public alignment: SpriteAlignment;
  public sprite: Sprite | null = null;
  public opacity = 1;

  constructor(sprite: Sprite | null = null, alignment = SpriteAlignment.MiddleCenter) {
    this.sprite = sprite;
    this.alignment = alignment;
  }
}
