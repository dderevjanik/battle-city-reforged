import { getGameRandom } from '../../core/Random';
import { Vector } from '../../core/Vector';
import { Rotation } from '../../game/Rotation';
import { Tank } from '../../gameObjects/Tank';
import { Dir, rotationToDir } from '../../sim/GameState';
import {
  AttackBaseState,
  Point,
  attackBasePhaseDecide,
  attackBasePhaseFire,
  attackBasePhaseStuck,
  initAttackBase,
  pickNearestBase,
} from '../../sim/behaviors/attackBase';
import * as config from '../../config';

import { TankBehavior } from '../TankBehavior';

const DIR_TO_ROTATION: readonly Rotation[] = [
  Rotation.Up,
  Rotation.Right,
  Rotation.Down,
  Rotation.Left,
];

// Always moves toward the player's base (nearest one if multiple).
export class AttackBaseTankBehavior extends TankBehavior {
  private bases: Point[];
  private state: AttackBaseState = initAttackBase();

  constructor(basePositions: Vector[] = []) {
    super();
    this.bases =
      basePositions.length > 0
        ? basePositions.map((b) => ({ x: b.x, y: b.y }))
        : [{ x: config.BASE_DEFAULT_POSITION.x, y: config.BASE_DEFAULT_POSITION.y }];
  }

  public update(tank: Tank, deltaTime: number): void {
    const rand = getGameRandom();

    const fire = attackBasePhaseFire(this.state, rand);
    this.state = fire.state;
    const hadFired = fire.tryFire ? tank.fire() === true : false;

    // Nearest base may change as the tank moves; recompute each phase.
    const target = pickNearestBase(this.bases, tank.position.x, tank.position.y);

    const decide = attackBasePhaseDecide(
      this.state,
      {
        x: tank.position.x,
        y: tank.position.y,
        rotation: rotationToDir(tank.rotation),
        targetX: target?.x ?? null,
        targetY: target?.y ?? null,
      },
      hadFired,
      rand,
    );
    this.state = decide.state;

    if (decide.rotate !== null) {
      tank.rotate(DIR_TO_ROTATION[decide.rotate as Dir]);
    }
    if (!decide.willMove) return;

    tank.move(deltaTime);

    const postTarget = pickNearestBase(this.bases, tank.position.x, tank.position.y);
    const stuck = attackBasePhaseStuck(
      this.state,
      {
        x: tank.position.x,
        y: tank.position.y,
        rotation: rotationToDir(tank.rotation),
        targetX: postTarget?.x ?? null,
        targetY: postTarget?.y ?? null,
      },
      rand,
    );
    this.state = stuck.state;
    if (stuck.rotate !== null) {
      tank.rotate(DIR_TO_ROTATION[stuck.rotate as Dir]);
    }
  }
}
