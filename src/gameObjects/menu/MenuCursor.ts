import { Animation } from '../../core/Animation';
import { GameObject } from '../../core/GameObject';
import { SpriteAlignment } from '../../core/SpriteAlignment';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { Rotation } from '../../game/Rotation';
import { TankAnimationFrame } from '../../tank/TankAnimationFrame';
import { TankColor } from '../../tank/TankColor';
import { TankMoveAnimation } from '../../tank/TankMoveAnimation';
import { TankType } from '../../tank/TankType';

export class MenuCursor extends GameObject {
  public readonly painter = new SpritePainter();
  private animation: Animation<TankAnimationFrame>;

  constructor() {
    super(60, 60);

    this.painter.alignment = SpriteAlignment.MiddleCenter;
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.animation = new TankMoveAnimation(
      spriteLoader,
      TankType.PlayerA(),
      [TankColor.Primary],
      Rotation.Right,
    );

    this.updateSprite();
  }

  protected update(deltaTime: number): void {
    this.animation.update(deltaTime);

    this.updateSprite();
  }

  private updateSprite(): void {
    const frame = this.animation.getCurrentFrame();
    const sprite = frame.getSprite(0);

    this.painter.sprite = sprite;
  }
}
