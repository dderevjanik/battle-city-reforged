import { Vector } from '../../core/Vector';
import { PowerupType } from '../../powerup/PowerupType';

export interface LevelPowerupPickedEvent {
  type: PowerupType;
  centerPosition: Vector;
  partyIndex: number;
}
