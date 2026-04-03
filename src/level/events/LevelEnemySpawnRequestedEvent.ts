import { Vector } from '../../core/Vector';
import { TankType } from '../../tank/TankType';

export interface LevelEnemySpawnRequestedEvent {
  type: TankType;
  position: Vector;
  partyIndex: number;
  unspawnedCount: number;
}
