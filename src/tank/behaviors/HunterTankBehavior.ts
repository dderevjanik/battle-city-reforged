import { Logger } from '../../core/Logger';
import { Timer } from '../../core/Timer';
import { Vector } from '../../core/Vector';
import { RandomUtils } from '../../core/utils';
import { Rotation } from '../../game/Rotation';
import { Tag } from '../../game/Tag';
import { Tank } from '../../gameObjects/Tank';
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

// Targets the player's current tile. At every tile intersection re-evaluates
// direction and turns toward the player (Blinky-style from Pac-Man).
export class HunterTankBehavior extends TankBehavior {
  private state: State = State.Moving;
  private lastPosition = new Vector(-1, -1);
  private thinkTimer = new Timer();
  private fireTimer = new Timer();
  private redirectTimer = new Timer();
  private log = new Logger(HunterTankBehavior.name, Logger.Level.Debug);

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
        // Exclude the blocked direction so we don't immediately re-hit the same wall
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
      this.log.debug('Hunter: stuck, thinking...');
      this.state = State.Thinking;
      this.thinkTimer.reset(THINK_DURATION);
      return;
    }

    // Periodically re-orient toward the player.
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

  // Picks the rotation from candidates that best closes distance to the player.
  private getBestRotation(tank: Tank, candidates: Rotation[]): Rotation {
    const target = this.getPlayerPosition(tank);
    if (target === null) {
      return RandomUtils.arrayElement(candidates);
    }

    const diff = target.clone().sub(tank.position);
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

  private getPlayerPosition(tank: Tank): Vector | null {
    let position: Vector | null = null;
    tank.parent?.traverseDescedants((node: Tank) => {
      if (position === null && node.tags?.includes(Tag.Player)) {
        position = node.position;
      }
    });
    this.log.debug('Hunter: player found=%s parent=%s', position !== null, tank.parent !== null);
    return position;
  }
}
