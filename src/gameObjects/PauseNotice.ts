import { Animation, GameObject, Sprite, SpritePainter } from '../core';
import { GameContext } from '../game';
import * as config from '../config';

export class PauseNotice extends GameObject {
  public zIndex = config.PAUSE_NOTICE_Z_INDEX;
  public ignorePause = true;
  public readonly painter = new SpritePainter();
  private animation: Animation<Sprite>;

  constructor() {
    super(156, 28);
  }

  public restart(): void {
    this.animation.reset();
  }

  protected setup({ spriteLoader }: GameContext): void {
    // Null as a second frame adds a blink effect
    this.animation = new Animation([spriteLoader.load('ui.pause'), null], {
      delay: 0.27,
      loop: true,
    });
  }

  protected update(deltaTime: number): void {
    this.animation.update(deltaTime);
    this.painter.sprite = this.animation.getCurrentFrame();
  }
}
