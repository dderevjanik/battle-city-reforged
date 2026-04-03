import { Vector } from '../../core/Vector';
import { PowerupType } from '../../powerup/PowerupType';

export interface LevelPowerupSpawnedEvent {
  type: PowerupType;
  position: Vector;
}
