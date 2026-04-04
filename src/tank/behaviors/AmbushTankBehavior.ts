import { Logger } from '../../core/Logger';
import { Timer } from '../../core/Timer';
import { Vector } from '../../core/Vector';
import { RandomUtils } from '../../core/utils';
import { Rotation } from '../../game/Rotation';
import { Tag } from '../../game/Tag';
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
const TILES_AHEAD = 4;
const REDIRECT_INTERVAL = 0.4;

const ROTATIONS = [Rotation.Up, Rotation.Down, Rotation.Left, Rotation.Right];

// Targets 4 tiles ahead of the player's current direction (Pinky-style from
// Pac-Man). At every tile intersection re-evaluates the intercept point.
export class AmbushTankBehavior extends TankBehavior {
  private state: State = State.Moving;
  private lastPosition = new Vector(-1, -1);
  private thinkTimer = new Timer();
  private fireTimer = new Timer();
  private redirectTimer = new Timer();
  private log = new Logger(AmbushTankBehavior.name, Logger.Level.Info);

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
      this.log.debug('Ambush: stuck, thinking...');
      this.state = State.Thinking;
      this.thinkTimer.reset(THINK_DURATION);
      return;
    }

    // Periodically re-orient toward the intercept point.
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

  // Picks the rotation from candidates that best closes distance to the ambush target.
  private getBestRotation(tank: Tank, candidates: Rotation[]): Rotation {
    const player = this.getPlayerTank(tank);
    if (player === null) {
      return RandomUtils.arrayElement(candidates);
    }

    const target = this.getAmbushTarget(player);
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

  private getPlayerTank(tank: Tank): Tank | null {
    let player: Tank | null = null;
    tank.parent?.traverseDescedants((node: Tank) => {
      if (player === null && node.tags?.includes(Tag.Player)) {
        player = node;
      }
    });
    return player;
  }

  // Projects 4 tiles ahead of the player's facing direction.
  private getAmbushTarget(player: Tank): Vector {
    const offset = TILES_AHEAD * config.TILE_SIZE_LARGE;
    const pos = player.position.clone();

    switch (player.rotation) {
      case Rotation.Up:    return pos.subY(offset);
      case Rotation.Down:  return pos.addY(offset);
      case Rotation.Left:  return pos.subX(offset);
      case Rotation.Right: return pos.addX(offset);
      default:             return pos;
    }
  }
}
