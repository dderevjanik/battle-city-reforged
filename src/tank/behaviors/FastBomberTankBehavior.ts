import { Timer } from '../../core/Timer';
import { Bomb } from '../../gameObjects/Bomb';
import { Tank } from '../../gameObjects/Tank';
import { GameContext } from '../../game/GameUpdateArgs';

import { TankBehavior } from '../TankBehavior';

const BOMB_DROP_INTERVAL = 5; // seconds between bomb drops

export class FastBomberTankBehavior extends TankBehavior {
  private bombTimer = new Timer(BOMB_DROP_INTERVAL);

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
      this.bombTimer.reset(BOMB_DROP_INTERVAL);
    }
  }

  private dropBomb(tank: Tank): void {
    const bomb = new Bomb(tank.partyIndex);
    tank.parent!.add(bomb);
    bomb.updateMatrix();
    bomb.setCenter(tank.getCenter());
    bomb.updateMatrix();
  }
}
