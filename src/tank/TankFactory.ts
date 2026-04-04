import { EnemyTank } from '../gameObjects/EnemyTank';
import { PlayerTank } from '../gameObjects/PlayerTank';

import { AiTankBehavior } from './behaviors/AiTankBehavior';
import { PlayerTankBehavior } from './behaviors/PlayerTankBehavior';
import { TankAiMode } from './TankAiMode';
import { TankAttributesFactory } from './TankAttributesFactory';
import { TankBehavior } from './TankBehavior';
import { TankType } from './TankTypes';

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
    const resolvedBehavior = behavior ?? TankFactory.createBehaviorForType(type);
    return new EnemyTank(type, resolvedBehavior, partyIndex);
  }

  private static createBehaviorForType(type: TankType): TankBehavior {
    const { ai } = TankAttributesFactory.create(type);
    switch (ai) {
      case TankAiMode.Classic:
      default:
        return new AiTankBehavior();
    }
  }
}
