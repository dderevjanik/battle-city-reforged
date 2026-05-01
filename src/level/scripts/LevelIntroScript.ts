import { Subject } from '../../core/Subject';
import { Timer } from '../../core/Timer';
import { Difficulty } from '../../game/Difficulty';
import { Curtain } from '../../gameObjects/Curtain';
import { LevelTitle } from '../../gameObjects/text/LevelTitle';
import * as config from '../../config';

import { LevelScript } from '../LevelScript';

export class LevelIntroScript extends LevelScript {
  public completed = new Subject();
  private curtain!: Curtain;
  private title!: LevelTitle;
  private timer!: Timer;

  protected setup(): void {
    this.timer = new Timer(config.LEVEL_START_DELAY);
    this.timer.done.addListener(this.handleTimer);

    // TODO: add them last order is important
    // TODO: curtain is displayed on top of scenes? (transition between levels)
    this.curtain = new Curtain(
      this.world.sceneRoot.size.width,
      this.world.sceneRoot.size.height,
      false,
    );
    this.world.sceneRoot.add(this.curtain);

    this.title = new LevelTitle(
      this.session.getLevelNumber(),
      this.session.isPlaytest(),
    );

    if (!this.session.isPlaytest() && !this.session.isDemo()) {
      const stageLabel = `STAGE ${this.session.getLevelNumber().toString().padStart(2, ' ')}`;
      const lines: string[] = [
        stageLabel,
        '',
        `DIFFICULTY ${this.getDifficultyText(this.session.getDifficulty())}`,
      ];

      const playerCount = this.session.getPlayerCount();
      for (let i = 0; i < playerCount; i++) {
        const lives = this.session.getPlayer(i).getLivesCount();
        const label = playerCount > 1 ? `${i + 1}P LIVES ${lives}` : `LIVES ${lives}`;
        lines.push(label);
      }

      this.title.setText(lines.join('\n'));
    }

    this.title.setCenter(this.world.sceneRoot.getSelfCenter());
    this.title.origin.set(0.5, 0.5);
    this.world.sceneRoot.add(this.title);
  }

  private getDifficultyText(difficulty: Difficulty): string {
    switch (difficulty) {
      case Difficulty.Hard:
        return 'HARD';
      case Difficulty.Extreme:
        return 'EXTREME';
      case Difficulty.Classic:
      default:
        return 'CLASSIC';
    }
  }

  protected update(deltaTime: number): void {
    this.timer.update(deltaTime);
  }

  private handleTimer = (): void => {
    this.curtain.open();
    this.title.setVisible(false);
    this.completed.notify(null);
  };
}
