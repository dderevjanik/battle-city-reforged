import { Sprite } from '../graphics';
import { Text } from '../text';

export class SpriteTextPainter {
  public text: Text<Sprite> = null;
  public color: string = null;
  public opacity = 1;

  constructor(text: Text<Sprite> = null, color: string = null) {
    this.text = text;
    this.color = color;
  }
}
