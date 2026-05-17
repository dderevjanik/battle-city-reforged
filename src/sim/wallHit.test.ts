import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Dir } from './GameState.ts';
import {
  Box,
  WallDamage,
  alignAgainstWallScalar,
  classifyWallHit,
  pickClosestWallContact,
} from './wallHit.ts';

const box = (x1: number, y1: number, x2: number, y2: number): Box => ({
  min: { x: x1, y: y1 },
  max: { x: x2, y: y2 },
});

// ---- pickClosestWallContact ----------------------------------------------

describe('pickClosestWallContact', () => {
  it('returns null on empty contact list', () => {
    assert.equal(pickClosestWallContact(box(0, 0, 10, 10), []), null);
  });

  it('returns the only contact when there is one', () => {
    const c = { box: box(20, 0, 30, 10), data: 'A' };
    assert.equal(pickClosestWallContact(box(0, 0, 10, 10), [c]), c);
  });

  it('picks the contact whose box center is closest', () => {
    const prev = box(0, 0, 10, 10);             // center 5,5
    const near = { box: box(20, 0, 30, 10), data: 'near' };   // center 25,5  dist²=400
    const far = { box: box(100, 0, 110, 10), data: 'far' };   // center 105,5 dist²=10000
    assert.equal(pickClosestWallContact(prev, [far, near])?.data, 'near');
  });

  it('on tie: keeps the FIRST contact (deterministic order)', () => {
    const prev = box(0, 0, 10, 10);
    const a = { box: box(20, 0, 30, 10), data: 'A' }; // center (25,5) dist=20
    const b = { box: box(-20, 0, -10, 10), data: 'B' }; // center (-15,5) dist=20
    assert.equal(pickClosestWallContact(prev, [a, b])?.data, 'A');
    // Order matters — flipping list flips winner.
    assert.equal(pickClosestWallContact(prev, [b, a])?.data, 'B');
  });
});

// ---- classifyWallHit ------------------------------------------------------

describe('classifyWallHit', () => {
  it('brick: destroys and plays brick sound (player bullet)', () => {
    assert.deepEqual(
      classifyWallHit('brick', WallDamage.Normal, true),
      { destroysWall: true, sound: 'brick' },
    );
  });

  it('steel with normal damage: blocks and plays steel sound (player)', () => {
    assert.deepEqual(
      classifyWallHit('steel', WallDamage.Normal, true),
      { destroysWall: false, sound: 'steel' },
    );
  });

  it('steel with high damage: destroys and plays brick sound (legacy parity)', () => {
    // Yes — the original used the brick sound on a high-damage steel break.
    assert.deepEqual(
      classifyWallHit('steel', WallDamage.High, true),
      { destroysWall: true, sound: 'brick' },
    );
  });

  it('border: blocks and plays steel sound', () => {
    assert.deepEqual(
      classifyWallHit('border', WallDamage.High, true),
      { destroysWall: false, sound: 'steel' },
    );
  });

  it('other: blocks silently', () => {
    assert.deepEqual(
      classifyWallHit('other', WallDamage.High, true),
      { destroysWall: false, sound: null },
    );
  });

  it('enemy bullet: NEVER plays a sound, regardless of wall', () => {
    for (const kind of ['brick', 'steel', 'border', 'other'] as const) {
      for (const damage of [WallDamage.Normal, WallDamage.High]) {
        const r = classifyWallHit(kind, damage, false);
        assert.equal(r.sound, null, `${kind}/${damage}: should be silent`);
      }
    }
  });

  it('destroysWall is independent of whether bullet is player-fired', () => {
    // Enemy bullets DO still destroy brick (silently).
    const r = classifyWallHit('brick', WallDamage.Normal, false);
    assert.equal(r.destroysWall, true);
    assert.equal(r.sound, null);
  });
});

// ---- alignAgainstWallScalar ----------------------------------------------

describe('alignAgainstWallScalar', () => {
  // Each case mirrors a branch of the legacy Bullet.collideWalls switch.
  it('Up: self.max.y - wall.max.y', () => {
    const self = box(0, 0, 10, 50);
    const wall = box(0, 30, 10, 40);
    assert.equal(alignAgainstWallScalar(self, wall, Dir.Up), 50 - 40);
  });

  it('Down: wall.min.y - self.min.y', () => {
    const self = box(0, 20, 10, 80);
    const wall = box(0, 50, 10, 60);
    assert.equal(alignAgainstWallScalar(self, wall, Dir.Down), 50 - 20);
  });

  it('Left: self.max.x - wall.max.x', () => {
    const self = box(0, 0, 80, 10);
    const wall = box(40, 0, 50, 10);
    assert.equal(alignAgainstWallScalar(self, wall, Dir.Left), 80 - 50);
  });

  it('Right: wall.min.x - self.min.x', () => {
    const self = box(10, 0, 80, 10);
    const wall = box(30, 0, 40, 10);
    assert.equal(alignAgainstWallScalar(self, wall, Dir.Right), 30 - 10);
  });
});
