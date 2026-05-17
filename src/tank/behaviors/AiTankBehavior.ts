import { getGameRandom } from '../../core/Random';
import { Rotation } from '../../game/Rotation';
import { Tank } from '../../gameObjects/Tank';
import { Dir, rotationToDir } from '../../sim/GameState';
import {
  AiState,
  aiPhaseDecide,
  aiPhaseFire,
  aiPhaseStuck,
  initAi,
} from '../../sim/behaviors/ai';
import * as config from '../../config';

import { TankBehavior } from '../TankBehavior';

const DIR_TO_ROTATION: readonly Rotation[] = [
  Rotation.Up,
  Rotation.Right,
  Rotation.Down,
  Rotation.Left,
];

/**
 * Thin adapter over the pure AI behavior in src/sim/behaviors/ai.ts.
 *
 * Per-tick orchestration:
 *   1. aiPhaseFire:    decide tryFire; advance the fire timer in state.
 *   2. tank.fire()     (only if tryFire) — adapter side effect.
 *   3. aiPhaseDecide:  given fire result, decide rotate / move.
 *   4. tank.rotate() and tank.move() — adapter side effects.
 *   5. aiPhaseStuck:   given post-move position, detect being stuck.
 *
 * Mode/timers live inside `this.state` rather than on Timer instances so that
 * everything the AI needs to network-replicate is one serializable struct.
 */
export class AiTankBehavior extends TankBehavior {
  private state: AiState = initAi();

  public update(tank: Tank, deltaTime: number): void {
    const rand = getGameRandom();
    const baseX = config.BASE_DEFAULT_POSITION.x;
    const baseY = config.BASE_DEFAULT_POSITION.y;
    const tileSize = config.TILE_SIZE_MEDIUM;

    // Phase 1: fire timing.
    const fire = aiPhaseFire(this.state, rand);
    this.state = fire.state;

    let hadFired = false;
    if (fire.tryFire) {
      hadFired = tank.fire() === true;
    }

    // Phase 2: rotate / move decision.
    const preObs = {
      x: tank.position.x,
      y: tank.position.y,
      rotation: rotationToDir(tank.rotation),
      baseX,
      baseY,
      tileSize,
    };
    const decide = aiPhaseDecide(this.state, preObs, hadFired, rand);
    this.state = decide.state;

    if (decide.rotate !== null) {
      tank.rotate(DIR_TO_ROTATION[decide.rotate as Dir]);
    }

    if (decide.willMove) {
      tank.move(deltaTime);

      // Phase 3: stuck detection — only meaningful when we actually moved.
      const stuck = aiPhaseStuck(
        this.state,
        {
          x: tank.position.x,
          y: tank.position.y,
          rotation: rotationToDir(tank.rotation),
          baseX,
          baseY,
          tileSize,
        },
        rand,
      );
      this.state = stuck.state;
    }
  }
}
