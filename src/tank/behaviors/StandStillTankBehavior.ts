import { Tank } from '../../gameObjects/Tank';

import { TankBehavior } from '../TankBehavior';

export class StandStillTankBehavior extends TankBehavior {
  public update(tank: Tank, deltaTime: number): void {
    // Do nothing
  }
}
