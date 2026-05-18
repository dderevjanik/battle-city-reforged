import { Vector } from '../core/Vector';
import { EnemyTank } from '../gameObjects/EnemyTank';
import { PlayerTank } from '../gameObjects/PlayerTank';

import { AiTankBehavior } from './behaviors/AiTankBehavior';
import { FastBomberTankBehavior } from './behaviors/FastBomberTankBehavior';
import { AmbushTankBehavior } from './behaviors/AmbushTankBehavior';
import { AttackBaseTankBehavior } from './behaviors/AttackBaseTankBehavior';
import { HunterTankBehavior } from './behaviors/HunterTankBehavior';
import { PlayerTankBehavior } from './behaviors/PlayerTankBehavior';
import { TankAiMode } from './TankAiMode';
import { TankAttributesFactory } from './TankAttributesFactory';
import { TankBehavior } from './TankBehavior';
import { TankKind, TankType } from './TankTypes';

export class TankFactory {
  public static createPlayer(
    partyIndex: number,
    type: TankType = TankType.PlayerA(),
    behavior: TankBehavior = new PlayerTankBehavior(),
  ): PlayerTank {
    return new PlayerTank(type, behavior, partyIndex);
  }

  public static createPlayerType(): TankType {
    return TankType.PlayerA();
  }

  public static createEnemy(
    partyIndex: number,
    type: TankType = TankType.EnemyA(),
    behavior?: TankBehavior,
  ): EnemyTank {
    const baseBehavior = behavior ?? TankFactory.createBehaviorForType(type);

    if (type.kind === TankKind.FastBomber) {
      const bomberBehavior = new FastBomberTankBehavior(new AiTankBehavior());
      const tank = new EnemyTank(type, bomberBehavior, partyIndex);
      // Register before LevelEnemyScript's died listener so parent is still valid
      tank.died.addListenerOnce(() => bomberBehavior.dropBombOnDeath(tank));
      return tank;
    }

    return new EnemyTank(type, baseBehavior, partyIndex);
  }

  public static createBehaviorForAiMode(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ai: TankAiMode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _basePositions: Vector[] = [],
  ): TankBehavior {
    // All enemies use the same default Classic AI. The per-type AI mode
    // (Hunter / Ambush / AttackBase) is intentionally ignored — those
    // variants exist in the data model and the pure modules, but the live
    // game gates them off until the host (or future per-level config) opts
    // back in.
    return new AiTankBehavior();
  }

  private static createBehaviorForType(_type: TankType): TankBehavior {
    return new AiTankBehavior();
  }
}
