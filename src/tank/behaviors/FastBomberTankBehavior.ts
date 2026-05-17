import { getGameRandom } from '../../core/Random';
import { Bomb } from '../../gameObjects/Bomb';
import { Tank } from '../../gameObjects/Tank';
import { GameContext } from '../../game/GameUpdateArgs';
import {
  BomberState,
  initBomber,
  stepBomber,
} from '../../sim/behaviors/bomber';

import { TankBehavior } from '../TankBehavior';

export class FastBomberTankBehavior extends TankBehavior {
  private bomber: BomberState = initBomber(getGameRandom());

  constructor(private readonly baseBehavior: TankBehavior) {
    super();
  }

  public setup(tank: Tank, context: GameContext): void {
    this.baseBehavior.setup(tank, context);
  }

  public update(tank: Tank, deltaTime: number): void {
    this.baseBehavior.update(tank, deltaTime);

    const { state, dropBomb } = stepBomber(this.bomber, getGameRandom());
    this.bomber = state;
    if (dropBomb) this.dropBomb(tank);
  }

  public dropBombOnDeath(tank: Tank): void {
    if (!this.bomber.hasDroppedBomb) {
      this.dropBomb(tank);
    }
  }

  private dropBomb(tank: Tank): void {
    this.bomber = { ...this.bomber, hasDroppedBomb: true };
    const bomb = new Bomb(tank.partyIndex);
    tank.parent!.add(bomb);
    bomb.updateMatrix();
    bomb.setCenter(tank.getCenter());
    bomb.updateMatrix();
  }
}
