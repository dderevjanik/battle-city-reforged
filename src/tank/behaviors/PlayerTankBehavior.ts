import { GameContext } from '../../game/GameUpdateArgs';
import { Rotation } from '../../game/Rotation';
import { PlayerTank } from '../../gameObjects/PlayerTank';
import { TankState } from '../../gameObjects/Tank';
import { InputManager } from '../../input/InputManager';
import { readLocalInputBits } from '../../net/readLocalInputBits';
import { Dir } from '../../sim/GameState';
import { stepPlayer } from '../../sim/behaviors/player';

import { TankBehavior } from '../TankBehavior';

const DIR_TO_ROTATION: readonly Rotation[] = [
  Rotation.Up,
  Rotation.Right,
  Rotation.Down,
  Rotation.Left,
];

/**
 * Player tank adapter. Responsibilities:
 *   1. Translate the local InputManager into PlayerInputBits — the format
 *      that will eventually arrive over the wire for remote peers.
 *   2. Call the pure stepPlayer with input + tank observation.
 *   3. Apply the resulting decisions as Tank side effects.
 *
 * The boundary between (1) and (2) is THE seam for networked multiplayer:
 * once a network layer can deliver a PlayerInputBits for each remote peer
 * per tick, the network code substitutes its bits for the local read and
 * the rest of the pipeline (stepPlayer + adapter (3)) is identical.
 */
export class PlayerTankBehavior extends TankBehavior {
  private inputManager!: InputManager;
  private session!: GameContext['session'];

  public setup(tank: PlayerTank, context: GameContext): void {
    this.inputManager = context.inputManager;
    this.session = context.session;
  }

  public update(tank: PlayerTank, deltaTime: number): void {
    const bits = readLocalInputBits(this.inputManager, this.session, tank.partyIndex);

    const decision = stepPlayer(bits, {
      isSliding: tank.isSliding(),
      isStunned: tank.isStunned(),
      isIdle: tank.state === TankState.Idle,
    });

    // WARNING: order is important. Fire BEFORE movement so the bullet is
    // placed at the tank's pre-move position. Tank position changes during
    // movement and may be corrected by collision resolution after this
    // update phase. (Comment carried verbatim from the legacy adapter — the
    // ordering invariant is the same, even though the code shape changed.)
    if (decision.tryFire) tank.fire();

    if (decision.rotate !== null) {
      tank.rotate(DIR_TO_ROTATION[decision.rotate as Dir]);
    }
    if (decision.willMove) tank.move(deltaTime);
    if (decision.willIdle) tank.idle();
  }

}
