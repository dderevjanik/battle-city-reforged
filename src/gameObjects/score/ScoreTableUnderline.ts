import { GameObject } from '../../core/GameObject';
import { RectPainter } from '../../core/painters/RectPainter';

export class ScoreTableUnderline extends GameObject {
  public painter = new RectPainter('#fff');

  constructor() {
    super(256, 8);
  }
}
