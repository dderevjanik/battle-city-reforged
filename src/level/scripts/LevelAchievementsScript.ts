import { GameContext } from '../../game/GameUpdateArgs';
import { AchievementNotification } from '../../gameObjects/AchievementNotification';
import { PowerupType } from '../../powerup/PowerupType';
import { TankDeathReason } from '../../tank/TankTypes';
import { Achievement } from '../../achievements/Achievement';
import { ACHIEVEMENTS } from '../../achievements/AchievementsRegistry';
import { AchievementsManager } from '../../achievements/AchievementsManager';
import { AchievementsTracker } from '../../achievements/AchievementsTracker';
import * as config from '../../config';

import { LevelScript } from '../LevelScript';
import {
  LevelEnemyDiedEvent,
  LevelPlayerDiedEvent,
  LevelPlayerSpawnCompletedEvent,
  LevelPowerupPickedEvent,
} from '../LevelEvents';

// Centered horizontally in the play field, near the bottom.
// Field: x=64→896, y=32→864 in sceneRoot canvas coords.
const BOX_WIDTH = 860;
const NOTIFICATION_X = Math.round(64 + (832 - BOX_WIDTH) / 2);
const NOTIFICATION_Y = 730;

export class LevelAchievementsScript extends LevelScript {
  private manager!: AchievementsManager;
  private tracker!: AchievementsTracker;
  private notificationQueue: Achievement[] = [];
  private isShowingNotification = false;
  private prevWipeoutUsedWithoutKill = false;

  protected setup(context: GameContext): void {
    this.manager = context.achievementsManager;
    this.tracker = context.achievementsTracker;

    if (this.session.getLevelNumber() === this.session.getStartLevelNumber()) {
      this.tracker.reset();
    }

    this.eventBus.playerDied.addListener(this.handlePlayerDied);
    this.eventBus.powerupPicked.addListener(this.handlePowerupPicked);
    this.eventBus.playerSpawnCompleted.addListener(this.handlePlayerSpawnCompleted);
    this.eventBus.enemyDied.addListener(this.handleEnemyDied);
    this.eventBus.enemyAllDied.addListener(this.handleEnemyAllDied);
    this.eventBus.levelGameOverCompleted.addListener(this.handleGameOverCompleted);
  }

  protected update(deltaTime: number): void {
    this.tracker.flushWipeout();

    // Detect VACANT_BATTLEFIELD unlock mid-level (wipeout with 0 kills)
    const wipeoutNow = this.tracker.isWipeoutUsedWithoutKill();
    if (wipeoutNow && !this.prevWipeoutUsedWithoutKill) {
      this.prevWipeoutUsedWithoutKill = true;
      this.checkAndNotify();
    }
  }

  private handlePlayerDied = (event: LevelPlayerDiedEvent): void => {
    this.tracker.recordDeath(this.session.getLevelNumber());
  };

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    this.tracker.recordPowerupPicked(event.type, this.session.getLevelNumber());

    if (event.type === PowerupType.Wipeout) {
      this.tracker.recordWipeoutPickup();
    }

    if (event.type === PowerupType.Upgrade) {
      // LevelPlayerScript has already updated sessionPlayer.tankKind by this point
      const kind = this.session.getPlayer(event.partyIndex).getTankKind();
      this.tracker.recordTankKindReached(kind);
      this.checkAndNotify();
    }
  };

  private handlePlayerSpawnCompleted = (event: LevelPlayerSpawnCompletedEvent): void => {
    // Capture carryover tank kind at the start of each level spawn
    const kind = this.session.getPlayer(event.partyIndex).getTankKind();
    this.tracker.recordTankKindReached(kind);
  };

  private handleEnemyDied = (event: LevelEnemyDiedEvent): void => {
    if (event.reason === TankDeathReason.WipeoutPowerup) {
      this.tracker.recordWipeoutKill();
    }
  };

  private handleEnemyAllDied = (): void => {
    // Record level cleared here (during the 3s win pause) so notifications
    // are visible before levelWinCompleted triggers the scene transition.
    this.tracker.recordLevelCleared(this.session.getLevelNumber());
    this.checkAndNotify();
  };

  private handleGameOverCompleted = (): void => {
    this.tracker.recordGameOver();
  };

  private checkAndNotify(): void {
    const newIds = this.tracker.getNewlyUnlocked(ACHIEVEMENTS, this.manager, this.session);
    for (const id of newIds) {
      this.manager.unlock(id);
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (achievement !== undefined) {
        this.notificationQueue.push(achievement);
      }
    }
    this.dequeueNotification();
  }

  private dequeueNotification(): void {
    if (this.isShowingNotification || this.notificationQueue.length === 0) {
      return;
    }

    const achievement = this.notificationQueue.shift()!;
    const notification = new AchievementNotification(achievement);
    notification.position.set(NOTIFICATION_X, NOTIFICATION_Y);
    this.world.sceneRoot.add(notification);

    this.isShowingNotification = true;
    notification.completed.addListener(() => {
      this.isShowingNotification = false;
      this.dequeueNotification();
    });
  }
}
