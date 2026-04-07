import { GameContext } from '../../game/GameUpdateArgs';
import { TerrainType } from '../../terrain/TerrainType';

import { LevelScript } from '../LevelScript';
import {
  LevelEnemyDiedEvent,
  LevelMapTileDestroyedEvent,
  LevelPlayerDiedEvent,
  LevelPowerupPickedEvent,
} from '../LevelEvents';
import { GameStatsManager } from '../../stats/GameStatsManager';

export class LevelStatsScript extends LevelScript {
  private statsManager!: GameStatsManager;

  protected setup(context: GameContext): void {
    this.statsManager = context.gameStatsManager;

    const stats = this.statsManager.getStats();

    if (this.session.getLevelNumber() === this.session.getStartLevelNumber()) {
      stats.sessions.started += 1;
    }

    this.eventBus.enemyDied.addListener(this.handleEnemyDied);
    this.eventBus.playerDied.addListener(this.handlePlayerDied);
    this.eventBus.playerFired.addListener(this.handlePlayerFired);
    this.eventBus.mapTileDestroyed.addListener(this.handleMapTileDestroyed);
    this.eventBus.powerupPicked.addListener(this.handlePowerupPicked);
    this.eventBus.levelWinCompleted.addListener(this.handleLevelWinCompleted);
    this.eventBus.levelGameOverCompleted.addListener(this.handleLevelGameOverCompleted);
    this.eventBus.baseDied.addListener(this.handleBaseDied);
  }

  private handleEnemyDied = (event: LevelEnemyDiedEvent): void => {
    const stats = this.statsManager.getStats();

    stats.enemiesKilled.total += 1;
    stats.enemiesKilled.byKind[event.type.kind] += 1;

    if (event.hitterPartyIndex !== null && event.hitterPartyIndex >= 0) {
      stats.enemiesKilled.byPlayer[event.hitterPartyIndex] =
        (stats.enemiesKilled.byPlayer[event.hitterPartyIndex] ?? 0) + 1;
    }

    this.statsManager.save();
  };

  private handlePlayerDied = (event: LevelPlayerDiedEvent): void => {
    const stats = this.statsManager.getStats();

    stats.deaths.total += 1;
    stats.deaths.byPlayer[event.partyIndex] =
      (stats.deaths.byPlayer[event.partyIndex] ?? 0) + 1;

    this.statsManager.save();
  };

  private handlePlayerFired = (): void => {
    const stats = this.statsManager.getStats();

    stats.bulletsFired += 1;

    this.statsManager.save();
  };

  private handleMapTileDestroyed = (event: LevelMapTileDestroyedEvent): void => {
    const stats = this.statsManager.getStats();

    if (event.type === TerrainType.Brick || event.type === TerrainType.BrickSuper) {
      stats.wallsDestroyed.brick += 1;
    } else if (event.type === TerrainType.Steel) {
      stats.wallsDestroyed.steel += 1;
    } else {
      return;
    }

    stats.wallsDestroyed.total += 1;

    this.statsManager.save();
  };

  private handlePowerupPicked = (event: LevelPowerupPickedEvent): void => {
    const stats = this.statsManager.getStats();

    stats.powerupsPicked.total += 1;
    stats.powerupsPicked.byType[event.type] =
      (stats.powerupsPicked.byType[event.type] ?? 0) + 1;

    this.statsManager.save();
  };

  private handleLevelWinCompleted = (): void => {
    const stats = this.statsManager.getStats();

    stats.levels.beaten += 1;
    stats.sessions.completed += 1;

    this.statsManager.save();
  };

  private handleLevelGameOverCompleted = (): void => {
    const stats = this.statsManager.getStats();

    stats.levels.failed += 1;
    stats.sessions.completed += 1;

    this.statsManager.save();
  };

  private handleBaseDied = (): void => {
    const stats = this.statsManager.getStats();

    stats.basesDestroyed += 1;

    this.statsManager.save();
  };
}
