import { Vector } from '../../core/Vector';
import { TankType } from '../../tank/TankType';

export interface LevelPlayerSpawnCompletedEvent {
  type: TankType;
  centerPosition: Vector;
  partyIndex: number;
}
