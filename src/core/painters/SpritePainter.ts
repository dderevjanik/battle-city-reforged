import { Sprite } from '../graphics';
import { SpriteAlignment } from '../SpriteAlignment';

export class SpritePainter {
  public alignment: SpriteAlignment;
  public sprite: Sprite = null;
  public opacity = 1;

  constructor(sprite: Sprite = null, alignment = SpriteAlignment.MiddleCenter) {
    this.sprite = sprite;
    this.alignment = alignment;
  }
}
