import { Vector } from '../../core/Vector';
import { TankType } from '../../tank/TankType';

export interface LevelPlayerDiedEvent {
  type: TankType;
  centerPosition: Vector;
  partyIndex: number;
}
