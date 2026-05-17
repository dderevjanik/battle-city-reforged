import { Subject } from '../../core/Subject';
import { Tank } from '../../gameObjects/Tank';
import {
  VictoryState,
  initVictory,
  stepVictory,
  victoryAfterFire,
} from '../../sim/behaviors/victory';

import { TankBehavior } from '../TankBehavior';

export class VictoryTankBehavior extends TankBehavior {
  public stopped = new Subject();
  public fired = new Subject();

  private state: VictoryState = initVictory();

  public update(tank: Tank, deltaTime: number): void {
    const decision = stepVictory(this.state);
    this.state = decision.state;

    if (decision.notifyStopped) this.stopped.notify(null);
    if (decision.willIdle) tank.idle();
    if (decision.willMove) tank.move(deltaTime);

    if (!decision.tryFire) return;

    const hadFired = tank.fire() === true;
    const { state, notifyFired } = victoryAfterFire(this.state, hadFired);
    this.state = state;
    if (notifyFired) this.fired.notify(null);
  }
}
