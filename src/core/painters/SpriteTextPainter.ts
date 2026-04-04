import { Sprite } from '../graphics/Sprite';
import { Text } from '../text/Text';

export class SpriteTextPainter {
  public text: Text<Sprite> | null = null;
  public color: string | null = null;
  public opacity = 1;

  constructor(text: Text<Sprite> | null = null, color: string | null = null) {
    this.text = text;
    this.color = color;
  }
}
