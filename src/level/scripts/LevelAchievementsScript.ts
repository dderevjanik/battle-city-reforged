import { GameContext } from '../../game/GameUpdateArgs';
import { PowerupType } from '../../powerup/PowerupType';
import { TankDeathReason } from '../../tank/TankTypes';
import { ACHIEVEMENTS } from '../../achievements/AchievementsRegistry';
import { AchievementsManager } from '../../achievements/AchievementsManager';
import { AchievementsTracker } from '../../achievements/AchievementsTracker';

import { LevelScript } from '../LevelScript';
import {
  LevelEnemyDiedEvent,
  LevelPlayerDiedEvent,
  LevelPlayerSpawnCompletedEvent,
  LevelPowerupPickedEvent,
} from '../LevelEvents';

export class LevelAchievementsScript extends LevelScript {
  private manager!: AchievementsManager;
  private tracker!: AchievementsTracker;

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
    this.eventBus.levelWinCompleted.addListener(this.handleLevelWinCompleted);
    this.eventBus.levelGameOverCompleted.addListener(this.handleGameOverCompleted);
  }

  protected update(): void {
    this.tracker.flushWipeout();
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

  private handleLevelWinCompleted = (): void => {
    this.tracker.recordLevelCleared(this.session.getLevelNumber());

    const newIds = this.tracker.getNewlyUnlocked(ACHIEVEMENTS, this.manager, this.session);
    for (const id of newIds) {
      this.manager.unlock(id);
    }
  };

  private handleGameOverCompleted = (): void => {
    this.tracker.recordGameOver();
  };
}
