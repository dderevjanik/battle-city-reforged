import { GameObject, SpritePainter } from '../../core';
import { GameContext } from '../../game';

export class LevelEnemyCounterItem extends GameObject {
  public readonly painter = new SpritePainter();

  constructor() {
    super(32, 32);
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.painter.sprite = spriteLoader.load('ui.enemy');
  }
}
