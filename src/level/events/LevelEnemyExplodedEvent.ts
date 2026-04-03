import { Vector } from '../../core/Vector';
import { TankDeathReason } from '../../tank/TankDeathReason';
import { TankType } from '../../tank/TankType';

export interface LevelEnemyExplodedEvent {
  type: TankType;
  centerPosition: Vector;
  reason: TankDeathReason;
}
