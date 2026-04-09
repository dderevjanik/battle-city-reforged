import { Timer } from '../../core/Timer';
import { RandomUtils } from '../../core/utils';
import { Bomb } from '../../gameObjects/Bomb';
import { Tank } from '../../gameObjects/Tank';
import { GameContext } from '../../game/GameUpdateArgs';

import { TankBehavior } from '../TankBehavior';

const BOMB_DROP_MIN_DELAY = 3;
const BOMB_DROP_MAX_DELAY = 8;

export class FastBomberTankBehavior extends TankBehavior {
  private bombTimer = new Timer(RandomUtils.number(BOMB_DROP_MIN_DELAY, BOMB_DROP_MAX_DELAY));
  private hasDroppedBomb = false;

  constructor(private readonly baseBehavior: TankBehavior) {
    super();
  }

  public setup(tank: Tank, context: GameContext): void {
    this.baseBehavior.setup(tank, context);
  }

  public update(tank: Tank, deltaTime: number): void {
    this.baseBehavior.update(tank, deltaTime);

    this.bombTimer.update(deltaTime);
    if (this.bombTimer.isDone()) {
      this.dropBomb(tank);
      this.bombTimer.reset(RandomUtils.number(BOMB_DROP_MIN_DELAY, BOMB_DROP_MAX_DELAY));
    }
  }

  public dropBombOnDeath(tank: Tank): void {
    if (!this.hasDroppedBomb) {
      this.dropBomb(tank);
    }
  }

  private dropBomb(tank: Tank): void {
    this.hasDroppedBomb = true;
    const bomb = new Bomb(tank.partyIndex);
    tank.parent!.add(bomb);
    bomb.updateMatrix();
    bomb.setCenter(tank.getCenter());
    bomb.updateMatrix();
  }
}
