import { GameObject } from '../core/GameObject';
import { Sound } from '../core/Sound';
import { Subject } from '../core/Subject';
import { assertNever } from '../core/assertNever';
import { Collision } from '../core/collision/Collision';
import { SweptBoxCollider } from '../core/collision/SweptBoxCollider';
import { SpritePainter } from '../core/painters/SpritePainter';
import { GameContext } from '../game/GameUpdateArgs';
import { Rotation } from '../game/Rotation';
import { Tag } from '../game/Tag';
import { TankBulletWallDamage } from '../tank/TankTypes';
import { Side, rotationToDir } from '../sim/GameState';
import { DIR_DELTA, resolveBulletPair } from '../sim/bullet';
import * as config from '../config';

import { SmallExplosion } from './SmallExplosion';
import { TerrainTileDestroyer } from './TerrainTileDestroyer';

export class Bullet extends GameObject {
  public collider: SweptBoxCollider = new SweptBoxCollider(this, true);
  public painter = new SpritePainter();
  public zIndex = config.BULLET_Z_INDEX;
  public ownerPartyIndex: number;
  public tankDamage: number;
  public wallDamage: number;
  public speed: number;
  public tags = [Tag.Bullet];
  public died = new Subject();
  private hitBrickSound!: Sound;
  private hitSteelSound!: Sound;

  constructor(
    ownerPartyIndex: number,
    speed: number,
    tankDamage: number,
    wallDamage: number,
  ) {
    super(config.BULLET_WIDTH, 16);

    this.ownerPartyIndex = ownerPartyIndex;
    this.speed = speed;
    this.tankDamage = tankDamage;
    this.wallDamage = wallDamage;

    this.pivot.set(0.5, 0.5);
  }

  protected setup({
    audioLoader,
    collisionSystem,
    spriteLoader,
  }: GameContext): void {
    collisionSystem.register(this.collider);

    this.hitBrickSound = audioLoader.load('hit.brick');
    this.hitSteelSound = audioLoader.load('hit.steel');

    const rotation = this.getWorldRotation();
    const spriteId = `bullet.${this.getRotationString(rotation)}`;
    const sprite = spriteLoader.load(spriteId);

    this.painter.sprite = sprite;
  }

  protected update(deltaTime: number): void {
    // Movement is delegated to the pure stepBullet rule via its underlying
    // displacement table. Once GameState becomes the source of truth this
    // method goes away entirely — the bullet view will just read its
    // position from the next snapshot.
    const delta = DIR_DELTA[rotationToDir(this.rotation)];
    const distance = this.speed * deltaTime;
    this.position.x += delta.dx * distance;
    this.position.y += delta.dy * distance;
    this.updateMatrix();

    this.collider.update();
  }

  protected collide(collision: Collision): void {
    this.collideBullets(collision);
    this.collideWalls(collision);
  }

  public nullify(): void {
    this.removeSelf();

    this.collider.unregister();

    this.died.notify(null);
  }

  public explode(): void {
    const explosion = new SmallExplosion();
    explosion.updateMatrix();
    explosion.setCenter(this.getCenter());
    this.replaceSelf(explosion);

    this.collider.unregister();

    this.died.notify(null);
  }

  private collideBullets(collision: Collision): void {
    const bulletContacts = collision.contacts.filter((contact) => {
      return contact.collider.object.tags.includes(Tag.Bullet);
    });

    // Pure-rule path: build minimal sides for this bullet and each contact,
    // ask the rule what to do, then apply side effects (nullify) here.
    bulletContacts.forEach((contact) => {
      const other = contact.collider.object as Bullet;
      const selfSide = this.tags.includes(Tag.Enemy) ? Side.Enemy : Side.Player;
      const otherSide = other.tags.includes(Tag.Enemy) ? Side.Enemy : Side.Player;
      const outcome = resolveBulletPair({ side: selfSide }, { side: otherSide });
      if (outcome.destroyA) this.nullify();
      if (outcome.destroyB) other.nullify();
    });
  }

  private collideWalls(collision: Collision): void {
    const wallContacts = collision.contacts.filter((contact) => {
      return contact.collider.object.tags.includes(Tag.Wall);
    });

    if (wallContacts.length === 0) {
      return;
    }

    // Find closest wall we are colliding with. It solves the "tunneling"
    // problem when bullet is going too fast it can jump over some walls.
    // By using swept box collider and then finding closest points of contact,
    // we make bullet interact with the first object on the way.
    // Bullet can also hit multiple blocks (most likely two) at the same time.
    let minDistance: number | null = null;

    wallContacts.forEach((contact) => {
      const prevBox = this.collider.getPrevBox();
      const distance = prevBox.distanceCenterToCenter(contact.box);

      if (minDistance === null || distance < minDistance) {
        minDistance = distance;
      }
    });

    const closestWallContacts = wallContacts.filter((contact) => {
      const prevBox = this.collider.getPrevBox();
      const distance = prevBox.distanceCenterToCenter(contact.box);

      return distance === minDistance;
    });

    if (closestWallContacts.length > 0) {
      const firstClosestWallContact = closestWallContacts[0];
      const wallWorldBox = firstClosestWallContact.box;

      const selfWorldBox = this.getWorldBoundingBox();

      const wall = firstClosestWallContact.collider.object;

      const isBrickWall = wall.tags.includes(Tag.Brick);
      const isBorderWall = wall.tags.includes(Tag.Border);
      const isSteelWall = wall.tags.includes(Tag.Steel);

      const canDestroySteelWall = this.wallDamage === TankBulletWallDamage.High;

      if (isBrickWall || (isSteelWall && canDestroySteelWall)) {
        const destroyer = new TerrainTileDestroyer(this.wallDamage);

        this.updateWorldMatrix(true);
        this.add(destroyer);

        destroyer.updateMatrix();
        destroyer.setCenter(this.getSelfCenter());

        // At this point destroyer is aligned by the main axis, i.e.
        // if bullet rotation is left/right - destroyer is aligned at "y";
        // if bullet rotation is up/down - destroyer is aligned at "x".
        // What is left is to fix counterpart axis.

        destroyer.updateMatrix();
        const destroyerWorldBox = destroyer.getWorldBoundingBox();

        const rotation = destroyer.getWorldRotation();
        if (rotation === Rotation.Up) {
          destroyer.translateY(destroyerWorldBox.max.y - wallWorldBox.max.y);
        } else if (rotation === Rotation.Down) {
          destroyer.translateY(wallWorldBox.min.y - destroyerWorldBox.min.y);
        } else if (rotation === Rotation.Left) {
          destroyer.translateY(destroyerWorldBox.max.x - wallWorldBox.max.x);
        } else if (rotation === Rotation.Right) {
          destroyer.translateY(wallWorldBox.min.x - destroyerWorldBox.min.x);
        }

        this.parent!.attach(destroyer);

        // TODO: it collides with multiple "bricks", multiple audio sources are
        // triggered
        // Only player bullets make sound
        if (this.tags.includes(Tag.Player)) {
          this.hitBrickSound.play();
        }
      } else if (isSteelWall || isBorderWall) {
        // Only player bullets make sound
        if (this.tags.includes(Tag.Player)) {
          this.hitSteelSound.play();
        }
      }

      // Reposition bullet to the place where it hits the wall so explosion
      // will go off in the right place. Now it is tied to axis.
      const rotation = this.getWorldRotation();
      if (rotation === Rotation.Up) {
        this.translateY(selfWorldBox.max.y - wallWorldBox.max.y);
      } else if (rotation === Rotation.Down) {
        this.translateY(wallWorldBox.min.y - selfWorldBox.min.y);
      } else if (rotation === Rotation.Left) {
        this.translateY(selfWorldBox.max.x - wallWorldBox.max.x);
      } else if (rotation === Rotation.Right) {
        this.translateY(wallWorldBox.min.x - selfWorldBox.min.x);
      }
      this.updateMatrix();

      this.explode();
    }
  }

  private getRotationString(rotation: Rotation): string {
    switch (rotation) {
      case Rotation.Up:
        return 'up';
      case Rotation.Down:
        return 'down';
      case Rotation.Left:
        return 'left';
      case Rotation.Right:
        return 'right';
      default:
        return assertNever(rotation);
    }
  }
}
