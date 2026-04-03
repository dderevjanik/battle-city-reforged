import { Timer } from '../../core';
import { AudioManager, GameContext } from '../../game';
import { GameOverHeading } from '../../gameObjects';
import { MenuInputContext } from '../../input';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

const SCENE_DURATION = 3;

export class MainGameOverScene extends GameScene {
  private heading = new GameOverHeading();
  private timer = new Timer(SCENE_DURATION);
  private audioManager: AudioManager;

  protected setup({ audioManager }: GameContext): void {
    this.audioManager = audioManager;

    this.timer.done.addListener(this.handleDone);

    this.heading.origin.set(0.5, 0.5);
    this.heading.setCenter(this.root.getSelfCenter());
    this.heading.position.addY(-32);
    this.root.add(this.heading);

    this.audioManager.play('game-over');
  }

  protected update(deltaTime: number): void {
    const { inputManager } = this.context;

    const inputMethod = inputManager.getActiveMethod();

    if (inputMethod.isDownAny(MenuInputContext.Skip)) {
      this.finish();
      return;
    }

    super.update(deltaTime);

    this.timer.update(deltaTime);
  }

  private handleDone = (): void => {
    this.finish();
  };

  private finish(): void {
    this.audioManager.stopAll();
    this.navigator.clearAndPush(GameSceneType.MainHighscore);
  }
}
