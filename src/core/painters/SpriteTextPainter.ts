import { Sprite } from '../graphics';
import { Text } from '../text';

import { Painter } from '../Painter';

export class SpriteTextPainter extends Painter {
  public text: Text<Sprite> = null;
  public color: string = null;
  public opacity = 1;

  constructor(text: Text<Sprite> = null, color: string = null) {
    super();

    this.text = text;
    this.color = color;
  }
}
