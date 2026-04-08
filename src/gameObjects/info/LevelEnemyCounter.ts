import { GameObject } from '../../core/GameObject';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';

import { SpriteText } from '../text/SpriteText';

export class LevelEnemyCounter extends GameObject {
  private icon = new GameObject(32, 32);
  private countText = new SpriteText('0');

  constructor(count = 0) {
    super(64, 80);

    this.countText.setText(count.toString());
  }

  public setCount(nextCount: number): void {
    this.countText.setText(nextCount.toString());
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.icon.painter = new SpritePainter(spriteLoader.load('ui.enemy'));
    this.icon.position.set(0, 0);
    this.add(this.icon);

    this.countText.position.set(8, 36);
    this.add(this.countText);
  }
}
