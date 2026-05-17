import { Tank } from '../../gameObjects/Tank';

import { TankBehavior } from '../TankBehavior';

// Stateless no-op. Used as a placeholder for tanks that should remain
// stationary. Not migrated — there is no logic to extract.
export class StandStillTankBehavior extends TankBehavior {
  public update(tank: Tank, deltaTime: number): void {
    // Intentionally empty.
  }
}
