import { Tank } from '../../gameObjects/Tank';

import { TankBehavior } from '../TankBehavior';

// Stateless: fires every tick (rate limit is enforced by TankWeaponSystem).
// Not migrated to a pure module because it has no internal state and no
// RNG — the "decision" is literally `tryFire: true` every tick. Calling
// tank.fire() directly here is already the minimum side effect.
export class StandFireTankBehavior extends TankBehavior {
  public update(tank: Tank, deltaTime: number): void {
    tank.fire();
  }
}
