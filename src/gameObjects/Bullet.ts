import { BoundingBox } from '../core/BoundingBox';
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
import {
  Box,
  WallDamage,
  WallKind,
  alignAgainstWallScalar,
  classifyWallHit,
  pickClosestWallContact,
} from '../sim/wallHit';
import * as config from '../config';

import { SmallExplosion } from './SmallExplosion';
import { TerrainTileDestroyer } from './TerrainTileDestroyer';

/** Engine BoundingBox → plain {min, max} that the pure rules consume. */
function boxFromBoundingBox(b: BoundingBox): Box {
  return {
    min: { x: b.min.x, y: b.min.y },
    max: { x: b.max.x, y: b.max.y },
  };
}

/** Wall-tag set → discriminated WallKind. Unknown wall types map to 'other'. */
function wallKindFromTags(tags: ReadonlyArray<unknown>): WallKind {
  if (tags.includes(Tag.Brick)) return 'brick';
  if (tags.includes(Tag.Steel)) return 'steel';
  if (tags.includes(Tag.Border)) return 'border';
  return 'other';
}

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
    const wallContacts = collision.contacts.filter((contact) =>
      contact.collider.object.tags.includes(Tag.Wall),
    );
    if (wallContacts.length === 0) return;

    // Pure-rule path: package each contact into the geometry tuple the rules
    // expect (box + raw contact for side-effect access), then ask the rule
    // which is the real hit. Solves the "tunneling" problem when a fast
    // bullet jumps over walls in a single tick.
    const prevBox = boxFromBoundingBox(this.collider.getPrevBox());
    const closest = pickClosestWallContact(
      prevBox,
      wallContacts.map((contact) => ({
        box: boxFromBoundingBox(contact.box),
        data: contact,
      })),
    );
    if (closest === null) return;

    const wallObj = closest.data.collider.object;
    const wallBox = closest.box;
    const selfBox = boxFromBoundingBox(this.getWorldBoundingBox());
    const dir = rotationToDir(this.getWorldRotation());

    const hit = classifyWallHit(
      wallKindFromTags(wallObj.tags),
      this.wallDamage === TankBulletWallDamage.High
        ? WallDamage.High
        : WallDamage.Normal,
      this.tags.includes(Tag.Player),
    );

    if (hit.destroysWall) {
      const destroyer = new TerrainTileDestroyer(this.wallDamage);

      this.updateWorldMatrix(true);
      this.add(destroyer);

      destroyer.updateMatrix();
      destroyer.setCenter(this.getSelfCenter());
      destroyer.updateMatrix();

      // After setCenter the destroyer is aligned on its primary axis;
      // translateY (rotation-aware) applies the fix-up on the perpendicular.
      const destroyerBox = boxFromBoundingBox(destroyer.getWorldBoundingBox());
      destroyer.translateY(alignAgainstWallScalar(destroyerBox, wallBox, dir));

      this.parent!.attach(destroyer);
    }

    if (hit.sound === 'brick') this.hitBrickSound.play();
    else if (hit.sound === 'steel') this.hitSteelSound.play();

    // Reposition bullet so the explosion goes off flush against the wall.
    this.translateY(alignAgainstWallScalar(selfBox, wallBox, dir));
    this.updateMatrix();

    this.explode();
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
