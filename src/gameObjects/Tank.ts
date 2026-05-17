import { Animation } from '../core/Animation';
import { BoundingBox } from '../core/BoundingBox';
import { GameObject } from '../core/GameObject';
import { State } from '../core/State';
import { Subject } from '../core/Subject';
import { Timer } from '../core/Timer';
import { Vector } from '../core/Vector';
import { Collision } from '../core/collision/Collision';
import { CollisionContact } from '../core/collision/CollisionContact';
import { CollisionSystem } from '../core/collision/CollisionSystem';
import { SweptBoxCollider } from '../core/collision/SweptBoxCollider';
import { SpritePainter } from '../core/painters/SpritePainter';
import { GameState } from '../game/GameState';
import { GameContext } from '../game/GameUpdateArgs';
import { Rotation } from '../game/Rotation';
import { Tag } from '../game/Tag';
import { TankAnimationFrame, TankDeathReason, TankType } from '../tank/TankTypes';
import { TankAttributes, TankAttributesFactory } from '../tank/TankAttributesFactory';
import { TankBehavior } from '../tank/TankBehavior';
import { TankSkinAnimation } from '../tank/TankSkinAnimation';
import { TankWeaponSystem } from '../tank/TankWeaponSystem';
import { Side, rotationToDir } from '../sim/GameState';
import { classifyBulletHit } from '../sim/bulletHit';
import { isOnIce as isOnIceRule, minkowskiResolve } from '../sim/tankCollision';
import {
  PlayerCollisionState as SimPlayerCollisionState,
  TankResolution,
  decideTankCollision,
  tickPlayerFsmFromUpdate,
  updatePlayerFsmDuringCollide,
} from '../sim/tankVsTank';
import { Box } from '../sim/wallHit';
import {
  shouldStartIceSlide,
  snapPositionOnRotate,
  tankMoveDelta,
} from '../sim/tankMotion';
import {
  ShieldState,
  SlideState,
  StunState,
  hasShield as hasShieldState,
  initShield,
  initSlide,
  initStun,
  isSliding as isSlidingState,
  isStunned as isStunnedState,
  startShield,
  startSlide,
  startStun,
  tickShield,
  tickSlide,
  tickStun,
} from '../sim/tankEffects';
import * as config from '../config';

import { BombBlast } from './BombBlast';
import { Bullet } from './Bullet';
import { Shield } from './Shield';

// Bridge from engine BoundingBox to the {min, max} shape the pure rules
// in sim/ consume. Kept inline rather than in a shared util because it is
// only needed by Tank/Bullet adapters.
function boxOf(b: BoundingBox): Box {
  return {
    min: { x: b.min.x, y: b.min.y },
    max: { x: b.max.x, y: b.max.y },
  };
}

export enum TankState {
  Uninitialized,
  Idle,
  Moving,
}

enum SpawnCollisionState {
  WaitUpdate,
  WaitCollide,
  NotColliding,
  Resolved,
}

// Use the sim enums directly so the values match what decideTankCollision
// expects. The State<T> wrapper still owns the per-tank instance.
const PlayerCollisionState = SimPlayerCollisionState;
type PlayerCollisionState = SimPlayerCollisionState;
const TankCollisionResolution = TankResolution;
type TankCollisionResolution = TankResolution;

const SKIN_LAYER_DESCRIPTIONS = [{ opacity: 1 }, { opacity: 0.5 }];
const SNAP_SIZE = config.TILE_SIZE_MEDIUM;

const STUN_BLINK_DELAY = 0.1;

export class Tank extends GameObject {
  public collider: SweptBoxCollider = new SweptBoxCollider(this, true);
  public tags = [Tag.Tank];
  // Tank index within it's party: players (0-1), enemies (0-19).
  public partyIndex = -1;
  public type: TankType;
  public behavior: TankBehavior;
  public attributes: TankAttributes;
  public skinAnimation!: TankSkinAnimation;
  public weapon = new TankWeaponSystem();
  public shield: Shield | null = null;
  public died = new Subject<{
    hitterPartyIndex: number | null;
    reason: TankDeathReason;
  }>();
  public hit = new Subject();
  public slided = new Subject();
  public state = TankState.Uninitialized;
  public freezeState = new State<boolean>(false);
  public isOnIce = false;
  protected shieldEffect: ShieldState = initShield();
  protected slideEffect: SlideState = initSlide();
  protected stunEffect: StunState = initStun();
  protected animation!: Animation<TankAnimationFrame>;
  protected skinLayers: GameObject[] = [];
  public get fired(): Subject<null> { return this.weapon.fired; }
  public get bullets(): Bullet[] { return this.weapon.bullets; }
  protected spawnCollisionState = new State<SpawnCollisionState>(
    SpawnCollisionState.WaitUpdate,
  );
  protected playerCollisionState = new State<PlayerCollisionState>(
    PlayerCollisionState.NotColliding,
  );
  protected tankCollisionResolution: TankCollisionResolution =
    TankCollisionResolution.Unknown;
  protected isCollisionAbusedByPlayer = false;
  protected collisionSystem!: CollisionSystem;
  protected context!: GameContext;
  protected gameState!: GameContext['gameState'];

  constructor(type: TankType, behavior: TankBehavior, partyIndex: number) {
    super(64, 64);

    this.pivot.set(0.5, 0.5);

    this.type = type;
    this.behavior = behavior;
    this.partyIndex = partyIndex;

    this.attributes = TankAttributesFactory.create(this.type);

    if (this.attributes.sprite !== undefined) {
      this.type.spriteKind = this.attributes.sprite;
    }

  }

  protected setup(context: GameContext): void {
    this.context = context;
    this.collisionSystem = context.collisionSystem;
    this.gameState = context.gameState;

    this.collisionSystem.register(this.collider);

    this.behavior.setup(this, context);

    SKIN_LAYER_DESCRIPTIONS.forEach(() => {
      const layer = new GameObject();
      layer.size.copyFrom(this.size);

      const painter = new SpritePainter();
      layer.painter = painter;

      this.skinLayers.push(layer);

      this.add(layer);
    });
  }

  protected update(deltaTime: number): void {
    const { gameState } = this;

    if (this.spawnCollisionState.is(SpawnCollisionState.WaitCollide)) {
      // Collide has not been called on prev frame means tank is not colliding
      // with anything
      this.enablePostSpawnCollision();
    } else if (this.spawnCollisionState.is(SpawnCollisionState.WaitUpdate)) {
      // If collision actually exists, #collide() will be called right after
      // this first update and we will know the state of collision.
      // If it won't be called, this state will stay hanging and we will receive
      // it here on the next #update() call. That means that tank is not
      // colliding with anything and we should make it collidable.
      this.spawnCollisionState.set(SpawnCollisionState.WaitCollide);
    }

    // Advance the per-frame player-collision FSM. Pure rule documented in
    // sim/tankVsTank.ts.
    this.playerCollisionState.set(
      tickPlayerFsmFromUpdate(this.playerCollisionState.get()),
    );

    // Shield: pure tick; on expiry edge, remove the Shield GameObject. The
    // legacy code did this in a Timer.done callback (handleShieldTimer).
    {
      const r = tickShield(this.shieldEffect);
      this.shieldEffect = r.state;
      if (r.ended && this.shield !== null) {
        this.shield.removeSelf();
        this.shield = null;
      }
    }

    const shouldIdle =
      this.freezeState.hasChangedTo(true) ||
      gameState.hasChangedTo(GameState.Paused);

    if (shouldIdle) {
      this.idle();
    }

    const isIdle = this.freezeState.is(true) || gameState.is(GameState.Paused);

    // Only update animation when idle
    if (isIdle) {
      this.updateAnimation(deltaTime);
      return;
    }

    // Slide: pure rule decides per-tick action. The two "end" cases
    // (timer expired vs. stepped off ice) collapse into the same edge
    // because the legacy code reacted identically (idle with no
    // ice-recheck).
    {
      const r = tickSlide(this.slideEffect, this.isOnIce);
      this.slideEffect = r.state;
      if (r.action === 'continue') this.move(deltaTime);
      else if (r.action === 'end') this.idle(false);
    }

    // Stun: pure rule manages stun + blink countdowns and visibility
    // toggling. On the expiry edge it forces visible=true (legacy
    // handleStunTimer behavior).
    if (isStunnedState(this.stunEffect)) {
      const r = tickStun(this.stunEffect, STUN_BLINK_DELAY);
      this.stunEffect = r.state;
      if (r.visibilityChanged) this.setVisible(this.stunEffect.visible);
    }

    // Behavior code is responsible for blocking movement for a tank when it
    // is sliding
    this.behavior.update(this, deltaTime);

    this.weapon.updateTimer(deltaTime);

    this.updateAnimation(deltaTime);

    this.collider.update();

    // Reset so in case tank leaves ice, flag will be correct. #collide() is
    // called right after and it will set the flag if tank is on ice.
    this.isOnIce = false;

    this.tankCollisionResolution = TankCollisionResolution.Unknown;
  }

  protected updateAnimation(deltaTime: number): void {
    this.skinAnimation.update(this, deltaTime);
    const frame = this.skinAnimation.getCurrentFrame();

    this.skinLayers.forEach((layer, index) => {
      const description = SKIN_LAYER_DESCRIPTIONS[index];

      const painter = layer.painter as SpritePainter;
      const sprite = frame.getSprite(index);

      painter.opacity = description.opacity;
      painter.sprite = sprite;
    });
  }

  protected collide(collision: Collision): void {
    this.collideIce(collision);
    this.collideSpawnedTanks(collision);
    this.collideWalls(collision);
    this.collideTanks(collision);
    this.collideBullets(collision);
    this.collideBombs(collision);
  }

  public fire(): boolean | void {
    return this.weapon.fire(this);
  }

  public move(deltaTime: number): void {
    if (this.state !== TankState.Moving) {
      this.state = TankState.Moving;
    }

    const { dx, dy } = tankMoveDelta(
      rotationToDir(this.rotation),
      this.attributes.moveSpeed,
      deltaTime,
    );
    this.position.x += dx;
    this.position.y += dy;
    this.updateMatrix(true);
  }

  public idle(checkIce = true): void {
    if (this.state !== TankState.Idle) {
      this.state = TankState.Idle;
    }

    // "Player releases controls while on ice" → start a brief slide.
    if (
      shouldStartIceSlide(
        checkIce,
        this.tags.includes(Tag.Player),
        this.isOnIce,
        this.isSliding(),
      )
    ) {
      this.slided.notify(null);
      this.slideEffect = startSlide(config.ICE_SLIDE_DURATION);
    }
  }

  public rotate(rotation: Rotation): this {
    // Magnetic-doorway snap: when facing changes, align the perpendicular
    // axis to the nearest tile so players don't get hung up on corners.
    const snapped = snapPositionOnRotate(
      this.position.x,
      this.position.y,
      rotationToDir(this.rotation),
      rotationToDir(rotation),
      SNAP_SIZE,
    );
    this.position.x = snapped.x;
    this.position.y = snapped.y;

    super.rotate(rotation);
    return this;
  }

  public die(
    reason: TankDeathReason = TankDeathReason.Bullet,
    hitterPartyIndex: number | null = null,
  ): void {
    const event = {
      hitterPartyIndex,
      reason,
    };
    this.died.notify(event);
    this.collider.unregister();
  }

  public activateShield(duration: number): void {
    if (this.shield !== null) {
      this.shield.removeSelf();
      this.shield = null;
    }

    this.shield = new Shield();
    this.shield.updateMatrix();
    this.shield.setCenter(this.getSelfCenter());

    this.add(this.shield);

    this.shieldEffect = startShield(duration);
  }

  public isAlive(): boolean {
    return this.attributes.health > 0;
  }

  protected receiveHit(damage: number, hitterPartyIndex: number): void {
    this.attributes.health = Math.max(0, this.attributes.health - damage);

    this.hit.notify(null);

    if (!this.isAlive()) {
      this.die(TankDeathReason.Bullet, hitterPartyIndex);
    }
  }

  public isSliding(): boolean {
    return isSlidingState(this.slideEffect);
  }

  public isStunned(): boolean {
    return isStunnedState(this.stunEffect);
  }

  protected collideIce(collision: Collision): void {
    // Only player can slip on ice
    if (this.tags.includes(Tag.Enemy)) return;

    const iceBoxes = collision.contacts
      .filter((c) => c.collider.object.tags.includes(Tag.Ice))
      .map((c) => boxOf(c.box));
    if (iceBoxes.length === 0) return;

    this.isOnIce = isOnIceRule(boxOf(this.getWorldBoundingBox()), iceBoxes);
  }

  // Try to solve the issue when some alive tank is
  // moving on top of a spawn and at the same time new tank has been spawned.
  // Not to toss the tanks around we simply don't enable collisions for
  // a newly spawned tank until these both tanks move away from each other.
  protected collideSpawnedTanks(collision: Collision): void {
    if (this.spawnCollisionState.is(SpawnCollisionState.WaitCollide)) {
      const tankContacts = collision.contacts.filter((contact) => {
        return contact.collider.object.tags.includes(Tag.Tank);
      });

      if (tankContacts.length > 0) {
        // Live one more cycle and check collisions on next frame
        this.spawnCollisionState.set(SpawnCollisionState.WaitUpdate);
      } else {
        // Collide has been called but there is no collision with other tanks.
        this.enablePostSpawnCollision();
      }
    }
  }

  protected collideWalls(collision: Collision): void {
    const wallContacts = [];

    for (const contact of collision.contacts) {
      const { tags } = contact.collider.object;

      if (tags.includes(Tag.BlockMove) && !tags.includes(Tag.Tank)) {
        wallContacts.push(contact);
      }
    }

    if (wallContacts.length === 0) {
      return;
    }

    // Find closest wall we are colliding with. It solves "tunneling" problem
    // if tank is going too fast it can jump over some small tiles of walls.
    // By using swept box collider and then finding closest points of contact,
    // we make tank interact with the first object on the way.
    // Tank can also hit multiple block at the same time.

    const closestWallContacts = this.getClosestContacts(
      wallContacts,
      this.collider.getPrevBox(),
    );

    if (closestWallContacts.length === 0) {
      return;
    }

    // Most likely it collides with multiple brick when going front and they
    // are positioned in one line near each other. So it will be enough to
    // resolve just one collision of them all.
    const firstWallContact = closestWallContacts[0];
    const otherCurrentBox = firstWallContact.collider.getCurrentBox();

    this.resolveMinkowski(otherCurrentBox, true);
  }

  protected resolveMinkowski(otherBox: BoundingBox, shouldSnap = false): void {
    // Pure rule decides side + raw displacement (legacy subX/subY signs).
    const r = minkowskiResolve(
      boxOf(this.collider.getCurrentBox()),
      boxOf(this.collider.getPrevBox()),
      boxOf(otherBox),
    );

    if (r.side === 'none') {
      // Degenerate (centers coincide); legacy code took no branch either.
      this.updateMatrix(true);
      this.collider.update();
      return;
    }

    this.position.x -= r.dx;
    this.position.y -= r.dy;

    if (shouldSnap) {
      if (r.side === 'top' || r.side === 'bottom') {
        this.position.snapY(SNAP_SIZE);
      } else {
        this.position.snapX(SNAP_SIZE);
      }
    }

    this.updateMatrix(true);
    this.collider.update();
  }

  protected collideTanks(collision: Collision): void {
    if (!this.tags.includes(Tag.BlockMove)) return;

    // Partition contacts. The legacy code did three filter passes; one loop.
    const tankContacts: CollisionContact[] = [];
    const wallContacts: CollisionContact[] = [];
    let hasPlayerTankContact = false;
    for (const contact of collision.contacts) {
      const { tags } = contact.collider.object;
      if (tags.includes(Tag.BlockMove)) {
        if (tags.includes(Tag.Tank)) tankContacts.push(contact);
        else wallContacts.push(contact);
      }
      if (tags.includes(Tag.Tank) && tags.includes(Tag.Player)) {
        hasPlayerTankContact = true;
      }
    }

    // FSM transition for player-collision (pure rule).
    this.playerCollisionState.set(
      updatePlayerFsmDuringCollide(
        this.playerCollisionState.get(),
        hasPlayerTankContact,
      ),
    );

    if (tankContacts.length === 0) return;

    const closest = this.getClosestContacts(tankContacts, this.collider.getPrevBox());
    const firstContact = closest[0];
    const otherCollider = firstContact.collider as SweptBoxCollider;
    const other = otherCollider.object as Tank;

    // Gather the inputs the pure rule needs from both tanks.
    const selfCurrentBox = this.collider.getCurrentBox();
    const selfPrevBox = this.collider.getPrevBox();
    const otherCurrentBox = otherCollider.getCurrentBox();
    const otherPrevBox = otherCollider.getPrevBox();

    const otherCollision = this.collisionSystem.getCollisionByCollider(other.collider);
    const selfContactsExceptOther = collision.contacts.filter(
      (c) => c.collider !== other.collider,
    ).length;
    const otherContactsExceptSelf = otherCollision
      ? otherCollision.contacts.filter((c) => c.collider !== this.collider).length
      : 0;

    const action = decideTankCollision({
      selfSide: this.tags.includes(Tag.Enemy) ? Side.Enemy : Side.Player,
      otherSide: other.tags.includes(Tag.Enemy) ? Side.Enemy : Side.Player,
      selfCurrentBox: boxOf(selfCurrentBox),
      selfPrevBox: boxOf(selfPrevBox),
      otherCurrentBox: boxOf(otherCurrentBox),
      otherPrevBox: boxOf(otherPrevBox),
      selfDirection: this.collider.getDirection().clone().normalize(),
      otherDirection: otherCollider.getDirection().clone().normalize(),
      selfPosX: this.position.x,
      selfPosY: this.position.y,
      selfTankWidth: this.size.width,
      selfTankHeight: this.size.height,
      bulletWidth: config.BULLET_WIDTH,
      tileSize: config.TILE_SIZE_MEDIUM,
      otherTankResolution: other.tankCollisionResolution,
      selfPlayerCollisionState: this.playerCollisionState.get(),
      otherPlayerCollisionState: other.playerCollisionState.get(),
      hasWallCollision: wallContacts.length > 0,
      selfContactsExceptOther,
      otherContactsExceptSelf,
    });

    switch (action.kind) {
      case 'skip':
        return;
      case 'set-player-colliding':
        this.playerCollisionState.set(PlayerCollisionState.Colliding);
        return;
      case 'resolve-against-other-prev':
        this.resolveMinkowski(otherPrevBox);
        this.tankCollisionResolution = TankCollisionResolution.Self;
        return;
      case 'resolve-against-other-current':
        // Other already rolled back; align to its CURRENT (post-rollback) box.
        // Adapter does NOT mark self as Self — matches legacy.
        this.resolveMinkowski(otherCurrentBox);
        return;
      case 'rollback':
        this.resolveByRollback(this.collider.getDirection());
        this.tankCollisionResolution = TankCollisionResolution.Both;
        return;
    }
  }

  protected collideBullets(collision: Collision): void {
    const bulletContacts = collision.contacts.filter((contact) => {
      return contact.collider.object.tags.includes(Tag.Bullet);
    });

    if (bulletContacts.length === 0) {
      return;
    }

    bulletContacts.forEach((contact) => {
      const bullet = contact.collider.object as Bullet;
      const tankSide = this.tags.includes(Tag.Enemy) ? Side.Enemy : Side.Player;
      const bulletSide = bullet.tags.includes(Tag.Enemy) ? Side.Enemy : Side.Player;

      const verdict = classifyBulletHit({
        isSelfBullet: this.weapon.hasBullet(bullet),
        hasShield: this.shield !== null,
        bulletSide,
        tankSide,
        friendlyFireEnabled: this.context.session.isFriendlyFireEnabled(),
        alreadyStunned: this.isStunned(),
      });

      switch (verdict) {
        case 'self-bullet':
        case 'enemy-vs-enemy':
          return;
        case 'shield-absorbs':
          bullet.nullify();
          return;
        case 'friendly-fire-disabled':
          // Legacy parity: visible explosion AND silent nullify. Both are
          // cleanups; nullify after explode is a no-op on tree but does
          // re-fire the `died` Subject. Preserved.
          bullet.explode();
          bullet.nullify();
          return;
        case 'friendly-fire-already-stunned':
          bullet.explode();
          return;
        case 'friendly-fire-stun':
          bullet.explode();
          this.stunEffect = startStun(
            config.FRIENDLY_FIRE_STUN_DURATION,
            STUN_BLINK_DELAY,
          );
          this.setVisible(this.stunEffect.visible);
          this.idle();
          return;
        case 'damage':
          bullet.explode();
          this.receiveHit(bullet.tankDamage, bullet.ownerPartyIndex);
          return;
      }
    });
  }

  private collideBombs(collision: Collision): void {
    // Only player tanks are damaged by enemy bomb blasts
    if (!this.tags.includes(Tag.Player)) {
      return;
    }

    const bombBlastContacts = collision.contacts.filter((contact) => {
      return contact.collider.object.tags.includes(Tag.BombBlast);
    });

    if (bombBlastContacts.length === 0) {
      return;
    }

    // Shield absorbs the blast
    if (this.shield !== null) {
      return;
    }

    bombBlastContacts.forEach((contact) => {
      const blast = contact.collider.object as BombBlast;
      this.receiveHit(blast.tankDamage, blast.ownerPartyIndex);
    });
  }

  protected resolveByRollback(direction: Vector): void {
    this.position.sub(direction);
    this.updateMatrix(true);

    this.collider.update();
  }

  protected getClosestContacts(
    contacts: CollisionContact[],
    selfBox: BoundingBox,
  ): CollisionContact[] {
    let minDistance = null;

    for (const contact of contacts) {
      const prevBox = selfBox;
      const distance = prevBox.distanceCenterToCenter(contact.box);

      if (minDistance === null || distance < minDistance) {
        minDistance = distance;
      }
    }

    const closestContacts = [];

    for (const contact of contacts) {
      const prevBox = selfBox;
      const distance = prevBox.distanceCenterToCenter(contact.box);

      if (distance === minDistance) {
        closestContacts.push(contact);
      }
    }

    return closestContacts;
  }

  protected enablePostSpawnCollision(): void {
    this.spawnCollisionState.set(SpawnCollisionState.Resolved);
    this.tags.push(Tag.BlockMove);
  }

  protected getDirection(): Vector | undefined {
    if (this.rotation === Rotation.Up) {
      return new Vector(0, -1);
    }
    if (this.rotation === Rotation.Down) {
      return new Vector(0, 1);
    }
    if (this.rotation === Rotation.Left) {
      return new Vector(-1, 0);
    }
    if (this.rotation === Rotation.Right) {
      return new Vector(1, 0);
    }
  }

}

