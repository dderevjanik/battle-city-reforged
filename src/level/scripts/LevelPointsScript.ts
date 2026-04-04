import { Points } from '../../gameObjects/Points';
import { PointsValue } from '../../points/PointsValue';
import { TankDeathReason, TankKind, TankType } from '../../tank/TankTypes';
import * as config from '../../config';

import { LevelScript } from '../LevelScript';
import {
  LevelEnemyExplodedEvent,
  LevelPowerupPickedEvent,
} from '../LevelEvents';

export class LevelPointsScript extends LevelScript {
  protected setup(): void {
    this.eventBus.enemyExploded.addListener(this.handleEnemyExploded);
    this.eventBus.powerupPicked.addListener(this.handlePowerupPicked);
  }

  private handleEnemyExploded = (event: LevelEnemyExplodedEvent): void => {
    // Only kills are awarded
    if (event.reason === TankDeathReason.WipeoutPowerup) {
      return;
    }

    const value = this.getEnemyTankPointsValue(event.type);

    const points = new Points(value, config.POINTS_ENEMY_TANK_DURATION);
    points.updateMatrix();
    points.setCenter(event.centerPosition);
    this.world.field.add(points);
  };

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    const points = new Points(PointsValue.V500, config.POINTS_POWERUP_DURATION);
    points.updateMatrix();
    points.setCenter(event.centerPosition);
    this.world.field.add(points);
  };

  private getEnemyTankPointsValue(type: TankType): PointsValue {
    switch (type.kind) {
      case TankKind.Basic:
        return PointsValue.V100;
      case TankKind.Fast:
        return PointsValue.V200;
      case TankKind.Medium:
        return PointsValue.V300;
      case TankKind.Heavy:
        return PointsValue.V400;
      default:
        return PointsValue.V100;
    }
  }
}
