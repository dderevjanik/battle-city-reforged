import { GameContext } from '../game/GameUpdateArgs';
import { Tank } from '../gameObjects/Tank';

export abstract class TankBehavior {
  public setup(tank: Tank, context?: GameContext): void {
    // Virtual
  }
  public abstract update(tank: Tank, deltaTime: number): void;
}
