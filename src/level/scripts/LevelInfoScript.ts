import { LevelInfo } from '../../gameObjects/info/LevelInfo';
import { LevelScoreInfo } from '../../gameObjects/info/LevelScoreInfo';
import { SpriteText } from '../../gameObjects/text/SpriteText';
import * as config from '../../config';

import { LevelScript } from '../LevelScript';
import {
  LevelEnemySpawnRequestedEvent,
  LevelPlayerDiedEvent,
} from '../LevelEvents';

export class LevelInfoScript extends LevelScript {
  private info!: LevelInfo;
  private scoreInfo: LevelScoreInfo | null = null;
  private lastScores: number[] = [];

  protected setup(): void {
    this.eventBus.playerDied.addListener(this.handlePlayerDied);
    this.eventBus.enemySpawnRequested.addListener(
      this.handleEnemySpawnRequested,
    );

    this.info = new LevelInfo();
    // HUD lives in the right-border area, which is always anchored to the
    // 832-wide playfield viewport regardless of the map's logical width.
    this.info.position.set(
      config.BORDER_LEFT_WIDTH + config.VIEWPORT_SIZE + 32,
      config.BORDER_TOP_BOTTOM_HEIGHT + 32,
    );
    this.world.sceneRoot.add(this.info);

    if (this.session.isDemo()) {
      const demoLabel = new SpriteText('DEMO', { color: config.COLOR_RED });
      demoLabel.position.set(5, 0);
      this.world.sceneRoot.add(demoLabel);
    } else if (this.session.getPlayerCount() === 1) {
      this.scoreInfo = new LevelScoreInfo();
      this.scoreInfo.position.set(5, 0);
      this.world.sceneRoot.add(this.scoreInfo);
    }

    this.info.setLevelNumber(this.session.getLevelNumber());

    this.session.players.forEach((playerSession, playerIndex) => {
      playerSession.lifeup.addListener(() => {
        this.info.setLivesCount(playerIndex, playerSession.getLivesCount());
      });

      this.info.setLivesCount(playerIndex, playerSession.getLivesCount());
      this.scoreInfo?.setScore(playerIndex, playerSession.getGamePoints());
    });
  }

  protected update(): void {
    this.session.players.forEach((playerSession, playerIndex) => {
      const points = playerSession.getGamePoints();
      if (this.lastScores[playerIndex] !== points) {
        this.lastScores[playerIndex] = points;
        this.scoreInfo?.setScore(playerIndex, points);
      }
    });
  }

  private handlePlayerDied = (event: LevelPlayerDiedEvent): void => {
    const playerIndex = event.partyIndex;
    const playerSession = this.session.getPlayer(playerIndex);

    this.info.setLivesCount(playerIndex, playerSession.getLivesCount());
  };

  private handleEnemySpawnRequested = (
    event: LevelEnemySpawnRequestedEvent,
  ): void => {
    this.info.setEnemyCount(event.unspawnedCount);
  };
}
