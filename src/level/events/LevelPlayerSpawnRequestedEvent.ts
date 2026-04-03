import { Vector } from '../../core/Vector';
import { TankType } from '../../tank/TankType';

export interface LevelPlayerSpawnRequestedEvent {
  type: TankType;
  partyIndex: number;
  position: Vector;
}
