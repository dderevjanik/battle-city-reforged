import { GameObject } from '../../core/GameObject';
import { GameContext } from '../../game/GameUpdateArgs';
import * as config from '../../config';

import { LevelEnemyCounter } from './LevelEnemyCounter';
import { LevelLivesCounter } from './LevelLivesCounter';
import { LevelNumberCounter } from './LevelNumberCounter';

export class LevelInfo extends GameObject {
  public zIndex = config.LEVEL_INFO_Z_INDEX;
  private enemyCounter = new LevelEnemyCounter();
  private livesCounters = [
    new LevelLivesCounter(0),
    new LevelLivesCounter(1),
    new LevelLivesCounter(2),
    new LevelLivesCounter(3),
  ];
  private levelNumberCounter = new LevelNumberCounter();

  constructor() {
    super(64, 768);
  }

  protected setup({ session }: GameContext): void {
    this.add(this.enemyCounter);

    const playerCount = session.getPlayerCount();
    // Space counters evenly below the enemy counter area (starts ~444px)
    // With 4 counters, use 72px spacing; with fewer, use 96px spacing
    const spacing = playerCount <= 2 ? 96 : 72;
    const startY = 444;

    for (let i = 0; i < playerCount; i++) {
      this.livesCounters[i].position.setY(startY + i * spacing);
      this.add(this.livesCounters[i]);
    }

    this.levelNumberCounter.position.setY(startY + playerCount * spacing);
    this.add(this.levelNumberCounter);
  }

  public setLevelNumber(levelNumber: number): void {
    this.levelNumberCounter.setLevelNumber(levelNumber);
  }

  public setLivesCount(playerIndex: number, livesCount: number): void {
    const counter = this.livesCounters[playerIndex];
    if (counter !== undefined) {
      counter.setCount(livesCount);
    }
  }

  public setEnemyCount(enemyCount: number): void {
    this.enemyCounter.setCount(enemyCount);
  }
}
