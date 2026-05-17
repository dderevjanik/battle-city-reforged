import { Tank } from '../../gameObjects/Tank';

import { PatrolTankBehavior } from './PatrolTankBehavior';

// Patrol + fire-every-tick. Composes the already-migrated PatrolTankBehavior
// (which delegates to src/sim/behaviors/patrol.ts) with a trivial fire side
// effect. The fire half has no state and no RNG, so there is nothing to put
// in a pure module — see StandFireTankBehavior for the same rationale.
export class PatrolFireTankBehavior extends PatrolTankBehavior {
  public update(tank: Tank, deltaTime: number): void {
    super.update(tank, deltaTime);
    tank.fire();
  }
}
