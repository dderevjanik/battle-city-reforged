import { getGameRandom } from '../../core/Random';
import { Rotation } from '../../game/Rotation';
import { Tag } from '../../game/Tag';
import { Tank } from '../../gameObjects/Tank';
import { Dir, rotationToDir } from '../../sim/GameState';
import {
  HunterState,
  hunterPhaseDecide,
  hunterPhaseFire,
  hunterPhaseStuck,
  initHunter,
} from '../../sim/behaviors/hunter';

import { TankBehavior } from '../TankBehavior';

const DIR_TO_ROTATION: readonly Rotation[] = [
  Rotation.Up,
  Rotation.Right,
  Rotation.Down,
  Rotation.Left,
];

// Targets the player's current tile. At every tile intersection re-evaluates
// direction and turns toward the player (Blinky-style from Pac-Man).
export class HunterTankBehavior extends TankBehavior {
  private state: HunterState = initHunter();

  public update(tank: Tank, deltaTime: number): void {
    const rand = getGameRandom();

    // Phase 1: fire.
    const fire = hunterPhaseFire(this.state, rand);
    this.state = fire.state;
    const hadFired = fire.tryFire ? tank.fire() === true : false;

    // Locate the nearest player tank. Side-effect of walking the live tree,
    // so it happens in the adapter — the pure rule only sees coordinates.
    const player = this.findPlayerPosition(tank);

    // Phase 2: decide.
    const decide = hunterPhaseDecide(
      this.state,
      {
        x: tank.position.x,
        y: tank.position.y,
        rotation: rotationToDir(tank.rotation),
        playerX: player?.x ?? null,
        playerY: player?.y ?? null,
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

    // Phase 3: stuck + periodic redirect.
    const postPlayer = this.findPlayerPosition(tank);
    const stuck = hunterPhaseStuck(
      this.state,
      {
        x: tank.position.x,
        y: tank.position.y,
        rotation: rotationToDir(tank.rotation),
        playerX: postPlayer?.x ?? null,
        playerY: postPlayer?.y ?? null,
      },
      rand,
    );
    this.state = stuck.state;
    if (stuck.rotate !== null) {
      tank.rotate(DIR_TO_ROTATION[stuck.rotate as Dir]);
    }
  }

  private findPlayerPosition(tank: Tank): { x: number; y: number } | null {
    let pos: { x: number; y: number } | null = null;
    tank.parent?.traverseDescedants((node) => {
      if (pos !== null) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags: unknown[] | undefined = (node as any).tags;
      if (tags && tags.includes(Tag.Player)) {
        pos = { x: node.position.x, y: node.position.y };
      }
    });
    return pos;
  }
}
