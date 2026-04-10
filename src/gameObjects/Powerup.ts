import { Animation } from '../core/Animation';
import { GameObject } from '../core/GameObject';
import { Subject } from '../core/Subject';
import { BoxCollider } from '../core/collision/BoxCollider';
import { Collision } from '../core/collision/Collision';
import { Sprite } from '../core/graphics/Sprite';
import { SpritePainter } from '../core/painters/SpritePainter';
import { GameContext } from '../game/GameUpdateArgs';
import { Tag } from '../game/Tag';
import { PowerupType } from '../powerup/PowerupType';
import * as config from '../config';

import { EnemyTank } from './EnemyTank';
import { PlayerTank } from './PlayerTank';

const PICKUP_MIN_INTERSECTION_SIZE = 16;

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
    const playerTankContacts = collision.contacts.filter((contact) => {
      return (
        contact.collider.object.tags.includes(Tag.Tank) &&
        contact.collider.object.tags.includes(Tag.Player)
      );
    });

    if (playerTankContacts.length > 0) {
      const firstPlayerTankContact = playerTankContacts[0];
      const tankBox = firstPlayerTankContact.collider.getBox();
      const selfBox = this.collider.getBox();

      // Fixes the issue that tank can pick up powerup with his collision box
      // even though tank is visually not exactly touching the powerup.
      // Calculate minimum intersection area in order for powerup to get
      // picked up.

      const intersectionBox = selfBox.clone().intersectWith(tankBox);
      const intersectionRect = intersectionBox.toRect();

      if (
        intersectionRect.width > PICKUP_MIN_INTERSECTION_SIZE &&
        intersectionRect.height > PICKUP_MIN_INTERSECTION_SIZE
      ) {
        const tank = firstPlayerTankContact.collider.object as PlayerTank;
        const { partyIndex } = tank;

        this.destroy();
        this.picked.notify({ partyIndex });
      }
    }

    const enemyTankContacts = collision.contacts.filter((contact) => {
      return (
        contact.collider.object.tags.includes(Tag.Tank) &&
        contact.collider.object.tags.includes(Tag.Enemy)
      );
    });

    if (enemyTankContacts.length > 0) {
      const firstEnemyTankContact = enemyTankContacts[0];
      const tankBox = firstEnemyTankContact.collider.getBox();
      const selfBox = this.collider.getBox();

      const intersectionBox = selfBox.clone().intersectWith(tankBox);
      const intersectionRect = intersectionBox.toRect();

      if (
        intersectionRect.width > PICKUP_MIN_INTERSECTION_SIZE &&
        intersectionRect.height > PICKUP_MIN_INTERSECTION_SIZE
      ) {
        const tank = firstEnemyTankContact.collider.object as EnemyTank;

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
    }
    return 'unknown';
  }
}
