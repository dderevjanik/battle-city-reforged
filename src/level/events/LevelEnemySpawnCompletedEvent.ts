import { Vector } from '../../core/Vector';
import { TankType } from '../../tank/TankType';

export interface LevelEnemySpawnCompletedEvent {
  type: TankType;
  centerPosition: Vector;
  partyIndex: number;
}
