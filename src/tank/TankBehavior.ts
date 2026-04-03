import { GameContext } from '../game';
import { Tank } from '../gameObjects';

export abstract class TankBehavior {
  public setup(tank: Tank, context?: GameContext): void {
    // Virtual
  }
  public abstract update(tank: Tank, deltaTime: number): void;
}
