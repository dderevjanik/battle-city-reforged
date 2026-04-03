import { GameObject } from '../../core/GameObject';
import { BoxCollider } from '../../core/collision/BoxCollider';
import { SpritePainter } from '../../core/painters/SpritePainter';
import { GameContext } from '../../game/GameUpdateArgs';
import { Rotation } from '../../game/Rotation';
import { Tag } from '../../game/Tag';
import { TankColor } from '../../tank/TankColor';
import { TankSpriteId } from '../../tank/TankSpriteId';
import { TankType } from '../../tank/TankType';

export class EditorTankDummy extends GameObject {
  public collider = new BoxCollider(this);
  public painter = new SpritePainter();
  public tags = [Tag.EditorBlockMove];
  private type: TankType;
  private color: TankColor;

  constructor(type: TankType, color: TankColor, rotation = Rotation.Up) {
    super(64, 64);

    this.type = type;
    this.color = color;
    this.pivot.set(0.5, 0.5);
    this.rotation = rotation;
  }

  protected setup({ collisionSystem, spriteLoader }: GameContext): void {
    collisionSystem.register(this.collider);

    const spriteId = TankSpriteId.create(
      this.type,
      this.color,
      this.rotation,
      1,
    );
    const sprite = spriteLoader.load(spriteId);
    this.painter.sprite = sprite;
  }

  protected update(): void {
    this.collider.update();
  }
}
