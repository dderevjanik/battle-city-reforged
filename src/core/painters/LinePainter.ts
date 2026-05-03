import { Vector } from '../Vector';

export class LinePainter {
  public readonly kind = 'line' as const;
  public positions: Vector[] = [];
  public strokeColor = '#000';
}
