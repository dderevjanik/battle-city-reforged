import { Logger } from '../../core/Logger';
import { Timer } from '../../core/Timer';
import { Vector } from '../../core/Vector';
import { RandomUtils } from '../../core/utils';
import { Rotation } from '../../game/Rotation';
import { Tank } from '../../gameObjects/Tank';
import * as config from '../../config';

import { TankBehavior } from '../TankBehavior';

enum State {
  Moving,
  Thinking,
  Firing,
}

const THINK_DURATION = 0.3;
const FIRE_MIN_DELAY = 0;
const FIRE_MAX_DELAY = 1.5;
const STUCK_FIRE_CHANCE = 30;
const REDIRECT_INTERVAL = 0.4;

const ROTATIONS = [Rotation.Up, Rotation.Down, Rotation.Left, Rotation.Right];

// Always moves toward the player's base.
export class AttackBaseTankBehavior extends TankBehavior {
  private state: State = State.Moving;
  private lastPosition = new Vector(-1, -1);
  private thinkTimer = new Timer();
  private fireTimer = new Timer();
  private redirectTimer = new Timer();
  private log = new Logger(AttackBaseTankBehavior.name, Logger.Level.Info);

  public update(tank: Tank, deltaTime: number): void {
    if (this.fireTimer.isDone()) {
      const hasFired = tank.fire();
      if (hasFired && this.state === State.Firing) {
        this.state = State.Moving;
      }
      this.attemptFire();
    } else {
      this.fireTimer.update(deltaTime);
    }

    if (this.state === State.Firing) {
      return;
    }

    if (this.state === State.Thinking) {
      if (this.thinkTimer.isDone()) {
        if (this.shouldFireWhenStuck()) {
          this.state = State.Firing;
          return;
        }
        this.state = State.Moving;
        tank.rotate(this.getBestRotation(tank, ROTATIONS.filter((r) => r !== tank.rotation)));
        return;
      }
      this.thinkTimer.update(deltaTime);
      return;
    }

    tank.move(deltaTime);

    const tankPosition = tank.position.clone().round();
    const isStuck =
      this.lastPosition.equals(tankPosition) && this.state === State.Moving;

    if (isStuck) {
      this.log.debug('AttackBase: stuck, thinking...');
      this.state = State.Thinking;
      this.thinkTimer.reset(THINK_DURATION);
      return;
    }

    if (this.redirectTimer.isDone()) {
      tank.rotate(this.getBestRotation(tank, ROTATIONS));
      this.redirectTimer.reset(REDIRECT_INTERVAL);
    } else {
      this.redirectTimer.update(deltaTime);
    }

    this.lastPosition = tankPosition;
  }

  private attemptFire(): void {
    const min = FIRE_MIN_DELAY * 1000;
    const max = FIRE_MAX_DELAY * 1000;
    this.fireTimer.reset(RandomUtils.number(min, max) / 1000);
  }

  private shouldFireWhenStuck(): boolean {
    return RandomUtils.probability(STUCK_FIRE_CHANCE);
  }

  private getBestRotation(tank: Tank, candidates: Rotation[]): Rotation {
    const base = new Vector(
      config.BASE_DEFAULT_POSITION.x,
      config.BASE_DEFAULT_POSITION.y,
    );
    const diff = base.clone().sub(tank.position);
    let best = candidates[0];
    let bestScore = -Infinity;

    for (const rotation of candidates) {
      const score = this.scoreRotation(rotation, diff);
      if (score > bestScore) {
        bestScore = score;
        best = rotation;
      }
    }
    return best;
  }

  private scoreRotation(rotation: Rotation, diff: Vector): number {
    switch (rotation) {
      case Rotation.Right: return diff.x;
      case Rotation.Left:  return -diff.x;
      case Rotation.Down:  return diff.y;
      case Rotation.Up:    return -diff.y;
    }
  }
}
