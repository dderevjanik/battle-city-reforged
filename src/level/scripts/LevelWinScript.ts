import { Timer } from '../../core/Timer';

import { LevelScript } from '../LevelScript';

const POST_WIN_DELAY = 3;

export class LevelWinScript extends LevelScript {
  // Disable by default
  protected enabled = false;
  private timer = new Timer();

  protected setup(): void {
    this.timer.reset(POST_WIN_DELAY);
    this.timer.done.addListener(this.handleTimer);
  }

  protected update(deltaTime: number): void {
    this.timer.update(deltaTime);
  }

  private handleTimer = (): void => {
    this.eventBus.levelWinCompleted.notify(null);
  };
}
