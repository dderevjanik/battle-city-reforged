import { Sprite } from '../core/graphics/Sprite';
import { SpriteLoader } from '../core/loaders/SpriteLoader';
import { Rotation } from '../game/Rotation';
import { PowerupType } from '../powerup/PowerupType';

export type TankDropType = 'random' | PowerupType;
export type TankDrop = TankDropType | TankDropType[];

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

export enum TankKind {
  Basic = 'basic',
  Fast = 'fast',
  Medium = 'medium',
  Heavy = 'heavy',
}

export enum TankColor {
  Default = 'default',
  Primary = 'primary',
  Secondary = 'secondary',
  Danger = 'danger',
}

export class TankType {
  public party: TankParty;
  public kind: TankKind;
  public drop: TankDrop | null;

  constructor(party: TankParty, kind: TankKind, drop: TankDrop | null = null) {
    this.party = party;
    this.kind = kind;
    this.drop = drop;
  }

  public setDrop(drop: TankDrop | null): this {
    this.drop = drop;

    return this;
  }

  public clone(): TankType {
    return new TankType(this.party, this.kind);
  }

  public increaseKind(targetKind: TankKind | null = null): this {
    if (targetKind !== null) {
      this.kind = targetKind;

      return this;
    }

    switch (this.kind) {
      case TankKind.Basic:
        this.kind = TankKind.Fast;
        break;
      case TankKind.Fast:
        this.kind = TankKind.Medium;
        break;
      case TankKind.Medium:
        this.kind = TankKind.Heavy;
      default:
        break;
    }

    return this;
  }

  public isMaxKind(): boolean {
    return this.kind === TankKind.Heavy;
  }

  public equals(other: TankType): boolean {
    return (
      this.party === other.party &&
      this.kind === other.kind &&
      this.drop === other.drop
    );
  }

  public serialize(): string {
    return `${this.party}-${this.kind}-${this.drop}`;
  }

  public toString(): string {
    return this.serialize();
  }

  public static PlayerA(): TankType {
    return new TankType(TankParty.Player, TankKind.Basic);
  }
  public static PlayerB(): TankType {
    return new TankType(TankParty.Player, TankKind.Fast);
  }
  public static PlayerC(): TankType {
    return new TankType(TankParty.Player, TankKind.Medium);
  }
  public static PlayerD(): TankType {
    return new TankType(TankParty.Player, TankKind.Heavy);
  }
  public static EnemyA(): TankType {
    return new TankType(TankParty.Enemy, TankKind.Basic);
  }
  public static EnemyB(): TankType {
    return new TankType(TankParty.Enemy, TankKind.Fast);
  }
  public static EnemyC(): TankType {
    return new TankType(TankParty.Enemy, TankKind.Medium);
  }
  public static EnemyD(): TankType {
    return new TankType(TankParty.Enemy, TankKind.Heavy);
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
      type.kind.toString(),
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

  public getSprite(index: number): Sprite | null {
    const sprite = this.sprites[index];
    if (sprite === undefined) {
      return null;
    }
    return sprite;
  }
}
