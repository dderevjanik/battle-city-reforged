import { Sprite } from '../graphics';

import { Painter } from '../Painter';
import { SpriteAlignment } from '../SpriteAlignment';

export class SpritePainter extends Painter {
  public alignment: SpriteAlignment;
  public sprite: Sprite = null;
  public opacity = 1;

  constructor(sprite: Sprite = null, alignment = SpriteAlignment.MiddleCenter) {
    super();

    this.sprite = sprite;
    this.alignment = alignment;
  }
}
