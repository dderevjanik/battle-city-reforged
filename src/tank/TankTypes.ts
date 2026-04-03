import { Sprite } from '../core/graphics/Sprite';
import { SpriteLoader } from '../core/loaders/SpriteLoader';
import { Rotation } from '../game/Rotation';

export enum TankParty {
  Player = 'player',
  Enemy = 'enemy',
}

export enum TankDeathReason {
  Bullet = 'bullet',
  WipeoutPowerup = 'wipeout',
}

export enum TankBulletWallDamage {
  Low = 1,
  High = 2,
}

export enum TankTier {
  A = 'a',
  B = 'b',
  C = 'c',
  D = 'd',
}

export enum TankColor {
  Default = 'default',
  Primary = 'primary',
  Secondary = 'secondary',
  Danger = 'danger',
}

export class TankType {
  public party: TankParty;
  public tier: TankTier;
  public hasDrop: boolean;

  constructor(party: TankParty, tier: TankTier, hasDrop = false) {
    this.party = party;
    this.tier = tier;
    this.hasDrop = hasDrop;
  }

  public setHasDrop(hasDrop): this {
    this.hasDrop = hasDrop;

    return this;
  }

  public clone(): TankType {
    return new TankType(this.party, this.tier);
  }

  public increaseTier(targetTier: TankTier = null): this {
    if (targetTier !== null) {
      this.tier = targetTier;

      return this;
    }

    switch (this.tier) {
      case TankTier.A:
        this.tier = TankTier.B;
        break;
      case TankTier.B:
        this.tier = TankTier.C;
        break;
      case TankTier.C:
        this.tier = TankTier.D;
      default:
        break;
    }

    return this;
  }

  public isMaxTier(): boolean {
    return this.tier === TankTier.D;
  }

  public equals(other: TankType): boolean {
    return (
      this.party === other.party &&
      this.tier === other.tier &&
      this.hasDrop === other.hasDrop
    );
  }

  public serialize(): string {
    return `${this.party}-${this.tier}-${this.hasDrop}`;
  }

  public toString(): string {
    return this.serialize();
  }

  public static PlayerA(): TankType {
    return new TankType(TankParty.Player, TankTier.A);
  }
  public static PlayerB(): TankType {
    return new TankType(TankParty.Player, TankTier.B);
  }
  public static PlayerC(): TankType {
    return new TankType(TankParty.Player, TankTier.C);
  }
  public static PlayerD(): TankType {
    return new TankType(TankParty.Player, TankTier.D);
  }
  public static EnemyA(): TankType {
    return new TankType(TankParty.Enemy, TankTier.A);
  }
  public static EnemyB(): TankType {
    return new TankType(TankParty.Enemy, TankTier.B);
  }
  public static EnemyC(): TankType {
    return new TankType(TankParty.Enemy, TankTier.C);
  }
  public static EnemyD(): TankType {
    return new TankType(TankParty.Enemy, TankTier.D);
  }
}

const SPRITE_TANK_PREFIX = 'tank';
const SPRITE_ID_SEPARATOR = '.';

export class TankSpriteId {
  public static create(
    type: TankType,
    color: TankColor,
    rotation: Rotation,
    frameNumber = 1,
  ): string {
    const parts = [
      SPRITE_TANK_PREFIX,
      type.party.toString(),
      color.toString(),
      type.tier.toString(),
      this.getRotationString(rotation),
      frameNumber.toString(),
    ];

    const spriteId = parts.join(SPRITE_ID_SEPARATOR);

    return spriteId;
  }

  private static getRotationString(rotation: Rotation): string {
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
        return 'unknown';
    }
  }
}

export class TankAnimationFrame {
  private sprites: Sprite[];

  constructor(
    spriteLoader: SpriteLoader,
    type: TankType,
    colors: TankColor[],
    rotation: Rotation,
    frameNumber = 1,
  ) {
    this.sprites = colors.map((color) => {
      const spriteId = TankSpriteId.create(type, color, rotation, frameNumber);
      const sprite = spriteLoader.load(spriteId);
      return sprite;
    });
  }

  public getSprite(index: number): Sprite {
    const sprite = this.sprites[index];
    if (sprite === undefined) {
      return null;
    }
    return sprite;
  }
}
