import { GameObject } from '../../core/GameObject';
import { GameContext } from '../../game/GameUpdateArgs';

import { SpriteText } from '../text/SpriteText';

export class LevelScoreCounter extends GameObject {
  private title!: SpriteText;
  private scoreText = new SpriteText('000000');
  constructor(_playerIndex: number) {
    super(160, 32);
  }

  protected setup(_ctx: GameContext): void {
    this.title = new SpriteText('S-');

    this.title.position.set(0, 0);
    this.add(this.title);

    // score starts after "S:" with extra gap
    this.scoreText.position.set(80, 0);
    this.add(this.scoreText);
  }

  public setScore(points: number): void {
    this.scoreText.setText(points.toString().padStart(6, '0'));
  }
}
