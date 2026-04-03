import { Animation } from '../../core/Animation';
import { GameObject } from '../../core/GameObject';
import { RectPainter } from '../../core/painters/RectPainter';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { Rotation } from '../../game/Rotation';
import { TankAnimationFrame, TankColor, TankType } from '../../tank/TankTypes';
import { TankIdleAnimation } from '../../tank/TankIdleAnimation';
import * as config from '../../config';

export class EditorEnemyPreview extends GameObject {
  public painter = new RectPainter(null, config.COLOR_WHITE);
  private container: GameObject;
  private animations: Animation<TankAnimationFrame>[] = [];
  private types: TankType[];
  private selectedIndex = -1;

  constructor(types: TankType[] = []) {
    super(96, 96);

    this.types = types;
  }

  public show(typeToShow: TankType): void {
    const index = this.types.findIndex((type) => type.equals(typeToShow));

    this.selectedIndex = index;

    if (this.selectedIndex === -1) {
      this.setVisible(false);
    } else {
      this.setVisible(true);
    }
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.container = new GameObject(64, 64);
    this.container.updateMatrix();
    this.container.setCenter(this.getSelfCenter());
    this.container.painter = new SpritePainter();
    this.add(this.container);

    this.animations = this.types.map((type) => {
      return new TankIdleAnimation(
        spriteLoader,
        type,
        [TankColor.Default],
        Rotation.Up,
      );
    });
  }

  protected update(deltaTime: number): void {
    const animation = this.animations[this.selectedIndex];
    if (animation === undefined) {
      return;
    }

    animation.update(deltaTime);

    const frame = animation.getCurrentFrame();
    const sprite = frame.getSprite(0);

    const painter = this.container.painter as SpritePainter;
    painter.sprite = sprite;
  }
}
