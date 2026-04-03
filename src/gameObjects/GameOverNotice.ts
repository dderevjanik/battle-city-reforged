import { GameObject } from '../core/GameObject';
import { SpritePainter } from '../core/painters/SpritePainter';
import { GameContext } from '../game/GameUpdateArgs';
import * as config from '../config';

export class GameOverNotice extends GameObject {
  public zIndex = config.GAME_OVER_NOTICE_Z_INDEX;
  public readonly painter = new SpritePainter();

  constructor() {
    super(124, 60);
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.painter.sprite = spriteLoader.load('ui.gameOver');
  }
}
