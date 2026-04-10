import * as Phaser from 'phaser';

// Extends Phaser.Math.Vector2 so Vector instances are compatible with any
// Phaser API that expects a Vector2 (physics bodies, tweens, etc.).
// Phaser already provides: set, add, subtract, scale, normalize, dot, cross,
// equals, length, negate, copy.
// This class keeps game-specific helpers and aliased names used throughout.
export class Vector extends Phaser.Math.Vector2 {
  // Aliases for Phaser methods that had different names in the custom class
  public sub(v: Phaser.Math.Vector2): this {
    return this.subtract(v) as this;
  }

  public multScalar(s: number): this {
    return this.scale(s) as this;
  }

  public copyFrom(v: Phaser.Math.Vector2): this {
    return this.copy(v) as this;
  }

  // Partial-axis mutations not in Phaser.Math.Vector2
  public setX(x: number): this {
    this.x = x;
    return this;
  }

  public setY(y: number): this {
    this.y = y;
    return this;
  }

  public addX(x: number): this {
    this.x += x;
    return this;
  }

  public addY(y: number): this {
    this.y += y;
    return this;
  }

  public subX(x: number): this {
    this.x -= x;
    return this;
  }

  public subY(y: number): this {
    this.y -= y;
    return this;
  }

  public divideScalar(s: number): this {
    this.x /= s;
    this.y /= s;
    return this;
  }

  public round(): this {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  public distanceTo(v: Phaser.Math.Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx ** 2 + dy ** 2);
  }

  public snapX(step = 1): this {
    this.x = Math.round(this.x / step) * step;
    return this;
  }

  public snapY(step = 1): this {
    this.y = Math.round(this.y / step) * step;
    return this;
  }

  // Override to return Vector instead of Phaser.Math.Vector2
  public clone(): Vector {
    return new Vector(this.x, this.y);
  }

  public static fromArray(array: number[]): Vector {
    return new Vector(array[0], array[1]);
  }
}
