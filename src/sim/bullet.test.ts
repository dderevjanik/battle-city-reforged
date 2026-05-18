import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Dir, Side, BulletState } from './GameState.ts';
import { stepBullet, resolveBulletPair, DIR_DELTA } from './bullet.ts';

const baseBullet: BulletState = {
  id: 1,
  ownerTankId: 1,
  side: Side.Player,
  x: 100,
  y: 100,
  rotation: Dir.Up,
  speed: 240,
  tankDamage: 1,
  wallDamage: 1,
};

describe('stepBullet', () => {
  it('is pure: does not mutate the input state', () => {
    const before = { ...baseBullet };
    stepBullet(baseBullet, 1 / 60);
    assert.deepEqual(baseBullet, before);
  });

  // Engine uses Phaser default y-down (y=0 top of screen, larger y is
  // visually down). Up direction = smaller y; Down = larger y. These
  // assertions reproduce the legacy translateY-with-Y_AXIS=(0,-1) behavior.
  it('moves Up bullets toward smaller y (visually up in y-down screen)', () => {
    const out = stepBullet({ ...baseBullet, rotation: Dir.Up }, 1 / 60);
    assert.equal(out.x, 100);
    assert.equal(out.y, 100 - 240 / 60);
  });

  it('moves Down bullets toward larger y', () => {
    const out = stepBullet({ ...baseBullet, rotation: Dir.Down }, 1 / 60);
    assert.equal(out.x, 100);
    assert.equal(out.y, 100 + 240 / 60);
  });

  it('moves Right bullets toward larger x', () => {
    const out = stepBullet({ ...baseBullet, rotation: Dir.Right }, 1 / 60);
    assert.equal(out.x, 100 + 240 / 60);
    assert.equal(out.y, 100);
  });

  it('moves Left bullets toward smaller x', () => {
    const out = stepBullet({ ...baseBullet, rotation: Dir.Left }, 1 / 60);
    assert.equal(out.x, 100 - 240 / 60);
    assert.equal(out.y, 100);
  });

  it('scales travel by the dt argument', () => {
    const a = stepBullet({ ...baseBullet, rotation: Dir.Up }, 1 / 60);
    const b = stepBullet({ ...baseBullet, rotation: Dir.Up }, 2 / 60);
    assert.equal(b.y - baseBullet.y, 2 * (a.y - baseBullet.y));
  });

  it('preserves non-positional fields exactly', () => {
    const out = stepBullet(baseBullet, 1 / 60);
    assert.equal(out.id, baseBullet.id);
    assert.equal(out.side, baseBullet.side);
    assert.equal(out.speed, baseBullet.speed);
    assert.equal(out.rotation, baseBullet.rotation);
    assert.equal(out.tankDamage, baseBullet.tankDamage);
    assert.equal(out.wallDamage, baseBullet.wallDamage);
    assert.equal(out.ownerTankId, baseBullet.ownerTankId);
  });

  it('DIR_DELTA is indexed by Dir enum value', () => {
    // Wire-format invariant: the array MUST be in Dir enum order AND use
    // the engine's y-down sign convention (Up = -y). If someone reorders
    // the Dir enum OR flips the sign convention, this test catches it
    // immediately — flipping signs was the source of an Aug-2026 motion-
    // inversion bug where Right moved the player Left.
    assert.deepEqual(DIR_DELTA[Dir.Up], { dx: 0, dy: -1 });
    assert.deepEqual(DIR_DELTA[Dir.Right], { dx: 1, dy: 0 });
    assert.deepEqual(DIR_DELTA[Dir.Down], { dx: 0, dy: 1 });
    assert.deepEqual(DIR_DELTA[Dir.Left], { dx: -1, dy: 0 });
  });
});

describe('resolveBulletPair', () => {
  const player = { side: Side.Player };
  const enemy = { side: Side.Enemy };

  it('annihilates both when player meets enemy', () => {
    assert.deepEqual(resolveBulletPair(player, enemy), {
      destroyA: true,
      destroyB: true,
    });
  });

  it('annihilates both when enemy meets player (symmetric)', () => {
    assert.deepEqual(resolveBulletPair(enemy, player), {
      destroyA: true,
      destroyB: true,
    });
  });

  it('passes through when two player bullets meet', () => {
    assert.deepEqual(resolveBulletPair(player, player), {
      destroyA: false,
      destroyB: false,
    });
  });

  it('passes through when two enemy bullets meet', () => {
    assert.deepEqual(resolveBulletPair(enemy, enemy), {
      destroyA: false,
      destroyB: false,
    });
  });
});
