import { Timer } from '../../core/Timer';
import { AudioManager } from '../../game/AudioManager';
import { GameContext } from '../../game/GameUpdateArgs';
import { GameOverHeading } from '../../gameObjects/text/GameOverHeading';
import { MenuInputContext } from '../../input/InputContexts';

import { GameScene } from '../GameScene';
import { GameSceneType } from '../GameSceneType';

const SCENE_DURATION = 3;

export class MainGameOverScene extends GameScene {
  private heading = new GameOverHeading();
  private timer = new Timer(SCENE_DURATION);
  private audioManager!: AudioManager;

  protected setup({ audioManager }: GameContext): void {
    this.audioManager = audioManager;

    this.timer.done.addListener(this.handleDone);

    this.heading.origin.set(0.5, 0.5);
    this.heading.setCenter(this.root.getSelfCenter());
    this.heading.position.addY(-32);
    this.root.add(this.heading);

    this.audioManager.play('game-over');
  }

  protected onUpdate(deltaTime: number): void {
    const { inputManager } = this.context;

    const inputMethod = inputManager.getActiveMethod();

    if (inputMethod.isDownAny(MenuInputContext.Skip)) {
      this.finish();
      return;
    }

    super.onUpdate(deltaTime);

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
