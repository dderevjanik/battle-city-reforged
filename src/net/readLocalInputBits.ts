/**
 * Shared input-reading helper.
 *
 * Two consumers:
 *   - PlayerTankBehavior reads its own player's bits each tick to drive
 *     the pure stepPlayer rule (the local-only path).
 *   - The multiplayer broadcast hook reads the local player's bits AFTER
 *     each sim tick to send over the wire.
 *
 * Both need to see exactly the same bits for the same tick, so the logic
 * lives here in one place rather than being duplicated.
 */

import { InputManager } from '../input/InputManager';
import { LevelPlayInputContext } from '../input/InputContexts';
import { Session } from '../game/Session';
import { InputBits, PlayerInputBits } from '../sim/Input';

export function readLocalInputBits(
  inputManager: InputManager,
  session: Session,
  partyIndex: number,
): PlayerInputBits {
  let inputMethod = inputManager.getActiveMethod();
  if (session.isMultiplayer()) {
    const playerSession = session.getPlayer(partyIndex);
    const playerInputVariant = playerSession.getInputVariant();
    if (playerInputVariant !== null) {
      inputMethod = inputManager.getMethodByVariant(playerInputVariant);
    }
  }

  let bits: PlayerInputBits = 0;
  if (inputMethod.isHoldAny(LevelPlayInputContext.MoveUp)) bits |= InputBits.Up;
  if (inputMethod.isHoldAny(LevelPlayInputContext.MoveDown)) bits |= InputBits.Down;
  if (inputMethod.isHoldAny(LevelPlayInputContext.MoveLeft)) bits |= InputBits.Left;
  if (inputMethod.isHoldAny(LevelPlayInputContext.MoveRight)) bits |= InputBits.Right;
  if (
    inputMethod.isDownAny(LevelPlayInputContext.Fire) ||
    inputMethod.isHoldAny(LevelPlayInputContext.RapidFire)
  ) {
    bits |= InputBits.Fire;
  }
  return bits;
}
