import { GameObject } from '../../core/GameObject';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';

export class LevelEnemyCounterItem extends GameObject {
  public readonly painter = new SpritePainter();

  constructor() {
    super(32, 32);
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.painter.sprite = spriteLoader.load('ui.enemy');
  }
}
