import { Rotation } from '../../game/Rotation';
import { Tank } from '../../gameObjects/Tank';
import { Dir, rotationToDir } from '../../sim/GameState';
import {
  PatrolState,
  initPatrol,
  stepPatrol,
} from '../../sim/behaviors/patrol';

import { TankBehavior } from '../TankBehavior';

// Mapping back from the compact Dir enum to the engine's Rotation degrees.
// Indexed by Dir enum value. Lives here, not in sim/, because the engine-side
// Rotation enum is a presentation detail of the GameObject tree.
const DIR_TO_ROTATION: readonly Rotation[] = [
  Rotation.Up,
  Rotation.Right,
  Rotation.Down,
  Rotation.Left,
];

export class PatrolTankBehavior extends TankBehavior {
  private state: PatrolState = initPatrol();

  public update(tank: Tank, deltaTime: number): void {
    // Adapter sequence preserves the original order: move first, then
    // observe the post-move position, then ask the pure rule whether we
    // need to reverse.
    tank.move(deltaTime);

    const { state: nextState, decision } = stepPatrol(this.state, {
      x: tank.position.x,
      y: tank.position.y,
      rotation: rotationToDir(tank.rotation),
    });

    this.state = nextState;

    if (decision.rotate !== null) {
      tank.rotate(DIR_TO_ROTATION[decision.rotate as Dir]);
    }
    if (decision.secondMove) {
      tank.move(deltaTime);
    }
  }
}
