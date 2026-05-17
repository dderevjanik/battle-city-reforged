import { Animation } from '../core/Animation';
import { BoundingBox } from '../core/BoundingBox';
import { GameObject } from '../core/GameObject';
import { Subject } from '../core/Subject';
import { assertNever } from '../core/assertNever';
import { BoxCollider } from '../core/collision/BoxCollider';
import { Collision } from '../core/collision/Collision';
import { Sprite } from '../core/graphics/Sprite';
import { SpritePainter } from '../core/painters/SpritePainter';
import { GameContext } from '../game/GameUpdateArgs';
import { Tag } from '../game/Tag';
import { PowerupType } from '../powerup/PowerupType';
import { shouldPickupPowerup } from '../sim/powerupPickup';
import { Box } from '../sim/wallHit';
import * as config from '../config';

import { EnemyTank } from './EnemyTank';
import { PlayerTank } from './PlayerTank';

function boxFromBoundingBox(b: BoundingBox): Box {
  return {
    min: { x: b.min.x, y: b.min.y },
    max: { x: b.max.x, y: b.max.y },
  };
}

export class Powerup extends GameObject {
  public zIndex = config.POWERUP_Z_INDEX;
  public collider: BoxCollider = new BoxCollider(this, true);
  public painter = new SpritePainter();
  public ignorePause = true;
  public picked = new Subject<{ partyIndex: number }>();
  public enemyPicked = new Subject<EnemyTank>();
  public type: PowerupType;
  private animation!: Animation<Sprite | null>;

  constructor(type: PowerupType) {
    super(64, 64);

    this.type = type;
  }

  public destroy(): void {
    this.removeSelf();
    this.collider.unregister();
  }

  protected setup({ collisionSystem, spriteLoader }: GameContext): void {
    collisionSystem.register(this.collider);

    const spriteId = this.getSpriteId();
    // Null as a second frame adds a blink effect
    const frames = [spriteLoader.load(spriteId), null];
    this.animation = new Animation(frames, {
      delay: 0.12,
      loop: true,
    });
  }

  protected update(deltaTime: number): void {
    this.collider.update();

    this.animation.update(deltaTime);
    this.painter.sprite = this.animation.getCurrentFrame();
  }

  protected collide(collision: Collision): void {
    const selfBox = boxFromBoundingBox(this.collider.getBox());

    const playerTankContact = collision.contacts.find((contact) =>
      contact.collider.object.tags.includes(Tag.Tank) &&
      contact.collider.object.tags.includes(Tag.Player),
    );
    if (playerTankContact) {
      const tankBox = boxFromBoundingBox(playerTankContact.collider.getBox());
      if (shouldPickupPowerup(selfBox, tankBox)) {
        const tank = playerTankContact.collider.object as PlayerTank;
        this.destroy();
        this.picked.notify({ partyIndex: tank.partyIndex });
      }
    }
    // No early return: legacy code allowed both `picked` and `enemyPicked`
    // to fire in the same tick if both touch (rare but possible). Preserved
    // for behavioral parity.

    const enemyTankContact = collision.contacts.find((contact) =>
      contact.collider.object.tags.includes(Tag.Tank) &&
      contact.collider.object.tags.includes(Tag.Enemy),
    );
    if (enemyTankContact) {
      const tankBox = boxFromBoundingBox(enemyTankContact.collider.getBox());
      if (shouldPickupPowerup(selfBox, tankBox)) {
        const tank = enemyTankContact.collider.object as EnemyTank;
        this.destroy();
        this.enemyPicked.notify(tank);
      }
    }
  }

  private getSpriteId(): string {
    switch (this.type) {
      case PowerupType.BaseDefence:
        return 'powerup.shovel';
      case PowerupType.Freeze:
        return 'powerup.clock';
      case PowerupType.Life:
        return 'powerup.tank';
      case PowerupType.Shield:
        return 'powerup.helmet';
      case PowerupType.Gun:
        return 'powerup.gun';
      case PowerupType.Upgrade:
        return 'powerup.star';
      case PowerupType.Wipeout:
        return 'powerup.grenade';
      default:
        return assertNever(this.type);
    }
  }
}
