import { Painter } from '../Painter';
import { Vector } from '../Vector';

export class LinePainter extends Painter {
  public positions: Vector[] = [];
  public strokeColor = '#000';
}
