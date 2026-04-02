import { GameUpdateArgs } from '../game';
import { Tank } from '../gameObjects';

export abstract class TankBehavior {
  public setup(tank: Tank, updateArgs?: GameUpdateArgs): void {
    // Virtual
  }
  public abstract update(tank: Tank, updateArgs?: GameUpdateArgs): void;
}
