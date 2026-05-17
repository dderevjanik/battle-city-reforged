import { getGameRandom } from '../../core/Random';
import { Rotation } from '../../game/Rotation';
import { Tag } from '../../game/Tag';
import { Tank } from '../../gameObjects/Tank';
import { Dir, rotationToDir } from '../../sim/GameState';
import {
  AmbushState,
  ambushPhaseDecide,
  ambushPhaseFire,
  ambushPhaseStuck,
  initAmbush,
  projectAmbushTarget,
} from '../../sim/behaviors/ambush';
import * as config from '../../config';

import { TankBehavior } from '../TankBehavior';

const DIR_TO_ROTATION: readonly Rotation[] = [
  Rotation.Up,
  Rotation.Right,
  Rotation.Down,
  Rotation.Left,
];

const TILES_AHEAD = 4;
const AMBUSH_OFFSET_PX = TILES_AHEAD * config.TILE_SIZE_LARGE;

// Targets 4 tiles ahead of the player's current direction (Pinky-style from
// Pac-Man). At every tile intersection re-evaluates the intercept point.
export class AmbushTankBehavior extends TankBehavior {
  private state: AmbushState = initAmbush();

  public update(tank: Tank, deltaTime: number): void {
    const rand = getGameRandom();

    const fire = ambushPhaseFire(this.state, rand);
    this.state = fire.state;
    const hadFired = fire.tryFire ? tank.fire() === true : false;

    const target = this.computeAmbushTarget(tank);

    const decide = ambushPhaseDecide(
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

    const postTarget = this.computeAmbushTarget(tank);
    const stuck = ambushPhaseStuck(
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

  /**
   * Find the nearest player tank and project the ambush target ahead of it.
   * Returns null when no player is alive. Tree walking lives here — the pure
   * `projectAmbushTarget` is invoked with plain coordinates.
   */
  private computeAmbushTarget(tank: Tank): { x: number; y: number } | null {
    let player: Tank | null = null;
    tank.parent?.traverseDescedants((node) => {
      if (player !== null) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags: unknown[] | undefined = (node as any).tags;
      if (tags && tags.includes(Tag.Player)) {
        player = node as Tank;
      }
    });
    if (player === null) return null;

    const p = player as Tank;
    return projectAmbushTarget(
      p.position.x,
      p.position.y,
      rotationToDir(p.rotation),
      AMBUSH_OFFSET_PX,
    );
  }
}
