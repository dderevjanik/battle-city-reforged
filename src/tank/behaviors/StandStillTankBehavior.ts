import { Tank } from '../../gameObjects';

import { TankBehavior } from '../TankBehavior';

export class StandStillTankBehavior extends TankBehavior {
  public update(tank: Tank, deltaTime: number): void {
    // Do nothing
  }
}
