import { Timer } from '../../core/Timer';
import { Vector } from '../../core/Vector';
import { Rotation } from '../../game/Rotation';
import { EnemyTank } from '../../gameObjects/EnemyTank';
import { PowerupType } from '../../powerup/PowerupType';
import { TankAiMode } from '../../tank/TankAiMode';
import { TankDeathReason, TankParty, TankType } from '../../tank/TankTypes';
import { TankFactory } from '../../tank/TankFactory';
import * as config from '../../config';

import { LevelScript } from '../LevelScript';
import {
  LevelEnemySpawnCompletedEvent,
  LevelPowerupPickedEvent,
} from '../LevelEvents';

export class LevelEnemyScript extends LevelScript {
  private list: TankType[] = [];
  private aiModes: (TankAiMode | undefined)[] = [];
  private listIndex = 0;
  private aliveTanks: EnemyTank[] = [];
  private positions: Vector[] = [];
  private positionIndex = 0;
  private spawnTimer = new Timer();
  private freezeTimer = new Timer();
  private spawningCount = 0;

  protected setup(): void {
    this.eventBus.enemySpawnCompleted.addListener(this.handleSpawnCompleted);
    this.eventBus.powerupPicked.addListener(this.handlePowerupPicked);

    this.list = this.mapConfig.getEnemySpawnList();
    this.aiModes = this.mapConfig.getEnemyAiModes();

    this.positions = this.mapConfig.getEnemySpawnPositions();

    this.spawnTimer.reset(config.ENEMY_FIRST_SPAWN_DELAY);
    this.spawnTimer.done.addListener(this.handleSpawnTimer);

    this.freezeTimer.done.addListener(this.handleFreezeTimer);
  }

  protected update(deltaTime: number): void {
    this.spawnTimer.update(deltaTime);
    this.freezeTimer.update(deltaTime);
  }

  private handleSpawnTimer = (): void => {
    // Happens after max enemies spawn
    if (this.aliveTanks.length >= this.getMaxAliveCount()) {
      this.spawnTimer.stop();
      return;
    }

    // No more tanks to spawn
    if (this.listIndex >= this.list.length) {
      this.spawnTimer.stop();
      return;
    }

    this.requestSpawn();

    // Start timer to spawn next enemy
    this.spawnTimer.reset(this.mapConfig.getEnemySpawnDelay());
  };

  private handleSpawnCompleted = (
    event: LevelEnemySpawnCompletedEvent,
  ): void => {
    this.spawningCount -= 1;

    const { type } = event;

    if (type.party !== TankParty.Enemy) {
      return;
    }

    const ai = this.aiModes[event.partyIndex];
    const behavior = TankFactory.createBehaviorForAiMode(ai ?? TankAiMode.Classic);
    const tank = TankFactory.createEnemy(event.partyIndex, type, behavior);
    tank.updateMatrix(); // Origin should be in before setting center
    tank.rotate(Rotation.Down);
    tank.setCenter(event.centerPosition);
    tank.updateMatrix();

    if (this.freezeTimer.isActive()) {
      tank.freezeState.set(true);
    }

    tank.hit.addListener(() => {
      this.eventBus.enemyHit.notify({
        type: tank.type,
      });
    });

    tank.died.addListener((deathEvent) => {
      this.eventBus.enemyDied.notify({
        type: tank.type,
        centerPosition: tank.getCenter(),
        reason: deathEvent.reason,
        hitterPartyIndex: deathEvent.hitterPartyIndex,
      });

      tank.removeSelf();

      // Remove from alive
      this.aliveTanks = this.aliveTanks.filter((aliveTank) => {
        return aliveTank !== tank;
      });

      // If timer was stopped because max count of alive enemies has been
      // reached, restart it, because one of alive tanks has just been killed
      if (!this.spawnTimer.isActive()) {
        this.spawnTimer.reset(this.mapConfig.getEnemySpawnDelay());
      }

      if (this.areAllDead()) {
        this.eventBus.enemyAllDied.notify(null);
      }
    });

    this.aliveTanks.push(tank);

    this.world.field.add(tank);
  };

  private requestSpawn(): void {
    this.spawningCount += 1;

    const type = this.list[this.listIndex];
    const position = this.positions[this.positionIndex];

    const partyIndex = this.listIndex;

    // Go to next tank
    this.listIndex += 1;

    // Take turns for positions where to spawn tanks
    this.positionIndex += 1;
    if (this.positionIndex >= this.positions.length) {
      this.positionIndex = 0;
    }

    const unspawnedCount = this.getUnspawnedCount();

    this.eventBus.enemySpawnRequested.notify({
      type,
      position,
      partyIndex,
      unspawnedCount,
    });
  }

  private getUnspawnedCount(): number {
    return this.list.length - this.listIndex;
  }

  private areAllDead(): boolean {
    const spawningCount = this.spawningCount;
    const unspawnedCount = this.getUnspawnedCount();
    const aliveCount = this.aliveTanks.length;

    const areAllDead =
      spawningCount === 0 && unspawnedCount === 0 && aliveCount === 0;

    return areAllDead;
  }

  private handleFreezeTimer = (): void => {
    this.aliveTanks.forEach((tank) => {
      tank.freezeState.set(false);
    });
  };

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    const { type: powerupType } = event;

    if (powerupType === PowerupType.Freeze) {
      this.freezeTimer.reset(config.FREEZE_POWERUP_DURATION);

      this.aliveTanks.forEach((tank) => {
        tank.freezeState.set(true);
      });
    }

    if (powerupType === PowerupType.Wipeout) {
      this.aliveTanks.forEach((tank) => {
        // Enemy with drop cant drop it when killed by powerup
        tank.discardDrop();

        // Pass death reason because picking up this powerup does not award
        // per-enemy points. Only powerup pickup points are awarded.
        tank.die(TankDeathReason.WipeoutPowerup);
      });
    }
  };

  private getMaxAliveCount(): number {
    return this.mapConfig.getEnemyMaxAliveCount();
  }
}
