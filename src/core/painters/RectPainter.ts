export class RectPainter {
  public readonly kind = 'rect' as const;
  public fillColor: string | null = null;
  public strokeColor: string | null = null;
  public lineWidth = 1;

  constructor(fillColor: string | null = null, strokeColor: string | null = null) {
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
  }
}
