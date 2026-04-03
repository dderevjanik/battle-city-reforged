import { Tank } from '../../gameObjects/Tank';

import { PatrolTankBehavior } from './PatrolTankBehavior';

export class PatrolFireTankBehavior extends PatrolTankBehavior {
  public update(tank: Tank, deltaTime: number): void {
    super.update(tank, deltaTime);

    tank.fire();
  }
}
