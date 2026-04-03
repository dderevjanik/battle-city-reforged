import { Painter } from '../Painter';

export class RectPainter extends Painter {
  public fillColor: string = null;
  public strokeColor: string = null;
  public lineWidth = 1;

  constructor(fillColor: string = null, strokeColor: string = null) {
    super();

    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
  }
}
