import { Animation } from '../core/Animation';
import { GameObject } from '../core/GameObject';
import { SpriteAlignment } from '../core/SpriteAlignment';
import { Subject } from '../core/Subject';
import { Sprite } from '../core/graphics/Sprite';
import { SpritePainter } from '../core/painters/SpritePainter';
import { GameContext } from '../game/GameUpdateArgs';
import * as config from '../config';

export class SmallExplosion extends GameObject {
  public zIndex = config.SMALL_EXPLOSION_Z_INDEX;
  public readonly painter = new SpritePainter();
  public readonly done = new Subject();
  protected animation!: Animation<Sprite>;

  constructor() {
    super(64, 64);

    this.painter.alignment = SpriteAlignment.MiddleCenter;
  }

  protected setup({ spriteLoader }: GameContext): void {
    this.animation = new Animation(
      spriteLoader.loadList([
        'explosion.small.1',
        'explosion.small.2',
        'explosion.small.3',
      ]),
      { delay: 0.05, loop: false },
    );
  }

  protected update(deltaTime: number): void {
    if (this.animation.isComplete()) {
      this.removeSelf();
      this.done.notify(null);
      return;
    }

    this.animation.update(deltaTime);
    this.painter.sprite = this.animation.getCurrentFrame();
  }
}
