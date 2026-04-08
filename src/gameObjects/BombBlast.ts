import { BoxCollider } from '../core/collision/BoxCollider';
import { GameObject } from '../core/GameObject';
import { RectPainter } from '../core/painters/RectPainter';
import { GameContext } from '../game/GameUpdateArgs';
import { Tag } from '../game/Tag';
import * as config from '../config';

const BLAST_SIZE = 128; // 2 tiles wide/tall = 1-tile blast radius on each side

export class BombBlast extends GameObject {
  public collider: BoxCollider = new BoxCollider(this, true);
  public painter = new RectPainter(); // invisible (no fill or stroke)
  public zIndex = config.BOMB_Z_INDEX;
  public readonly ownerPartyIndex: number;
  public readonly tankDamage = 1;
  public tags = [Tag.BombBlast];
  private lifeCount = 0;

  constructor(ownerPartyIndex: number) {
    super(BLAST_SIZE, BLAST_SIZE);
    this.ownerPartyIndex = ownerPartyIndex;
    this.pivot.set(0.5, 0.5);
  }

  protected setup({ collisionSystem }: GameContext): void {
    collisionSystem.register(this.collider);
  }

  protected update(): void {
    this.collider.update();
    if (this.lifeCount > 0) {
      this.collider.unregister();
      this.removeSelf();
      return;
    }
    this.lifeCount++;
  }
}
