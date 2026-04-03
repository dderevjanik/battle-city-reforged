export class RectPainter {
  public fillColor: string = null;
  public strokeColor: string = null;
  public lineWidth = 1;

  constructor(fillColor: string = null, strokeColor: string = null) {
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
  }
}
