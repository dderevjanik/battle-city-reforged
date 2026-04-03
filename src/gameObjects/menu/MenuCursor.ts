import {
  Animation,
  GameObject,
  SpriteAlignment,
  SpritePainter,
} from '../../core';
import { GameContext, Rotation } from '../../game';
import {
  TankAnimationFrame,
  TankColor,
  TankType,
  TankMoveAnimation,
} from '../../tank';

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
