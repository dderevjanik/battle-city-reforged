import { GameObject } from '../../core/GameObject';
import { GameContext } from '../../game/GameUpdateArgs';
import * as config from '../../config';

import { LevelScoreCounter } from './LevelScoreCounter';

export class LevelScoreInfo extends GameObject {
  public zIndex = config.LEVEL_INFO_Z_INDEX;
  private scoreCounters = [
    new LevelScoreCounter(0),
    new LevelScoreCounter(1),
    new LevelScoreCounter(2),
    new LevelScoreCounter(3),
  ];

  constructor() {
    super(768, 32);
  }

  protected setup({ session }: GameContext): void {
    const playerCount = session.getPlayerCount();

    for (let i = 0; i < playerCount; i++) {
      this.scoreCounters[i].position.setX(i * 64);
      this.add(this.scoreCounters[i]);
    }
  }

  public setScore(playerIndex: number, points: number): void {
    const counter = this.scoreCounters[playerIndex];
    if (counter !== undefined) {
      counter.setScore(points);
    }
  }
}
