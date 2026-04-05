import { Base } from '../../gameObjects/Base';
import { PowerupType } from '../../powerup/PowerupType';
import * as config from '../../config';

import { LevelScript } from '../LevelScript';
import {
  LevelEnemyPowerupPickedEvent,
  LevelPowerupPickedEvent,
} from '../LevelEvents';

export class LevelBaseScript extends LevelScript {
  private bases: Base[] = [];

  protected setup(): void {
    this.eventBus.powerupPicked.addListener(this.handlePowerupPicked);
    this.eventBus.enemyPowerupPicked.addListener(this.handleEnemyPowerupPicked);

    for (const basePos of this.mapConfig.getBasePositions()) {
      const base = new Base();
      base.position.set(basePos.x, basePos.y);
      base.died.addListener(() => {
        this.eventBus.baseDied.notify(null);
      });
      this.world.field.add(base);
      this.bases.push(base);
    }
  }

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    const { type: powerupType } = event;

    if (powerupType === PowerupType.BaseDefence) {
      for (const base of this.bases) {
        base.activateDefence(config.BASE_DEFENCE_POWERUP_DURATION);
      }
    }
  };

  private handleEnemyPowerupPicked = (
    event: LevelEnemyPowerupPickedEvent,
  ): void => {
    if (event.type === PowerupType.BaseDefence) {
      for (const base of this.bases) {
        base.deactivateDefence();
      }
    }
  };
}
