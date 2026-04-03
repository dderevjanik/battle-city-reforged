import { Animation } from '../core/Animation';
import { GameObject } from '../core/GameObject';
import { Sprite } from '../core/graphics/Sprite';
import { SpritePainter } from '../core/painters/SpritePainter';
import { GameState } from '../game/GameState';
import { GameContext } from '../game/GameUpdateArgs';
import * as config from '../config';

export class Shield extends GameObject {
  public ignorePause = true;
  public zIndex = config.SHIELD_Z_INDEX;
  public painter = new SpritePainter();
  private animation: Animation<Sprite>;
  private gameState: GameContext['gameState'];

  constructor() {
    super(64, 64);
  }

  protected setup(context: GameContext): void {
    this.gameState = context.gameState;

    this.animation = new Animation(
      context.spriteLoader.loadList(['shield.1', 'shield.2']),
      { delay: 0.05, loop: true },
    );
  }

  protected update(deltaTime: number): void {
    // Shield is not displayed during a pause
    if (this.gameState.hasChangedTo(GameState.Paused)) {
      this.setVisible(false);
    }
    if (this.gameState.hasChangedTo(GameState.Playing)) {
      this.setVisible(true);
    }
    if (this.gameState.is(GameState.Paused)) {
      return;
    }

    this.animation.update(deltaTime);
    this.painter.sprite = this.animation.getCurrentFrame();
  }
}
