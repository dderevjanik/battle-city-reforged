import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Dir } from './GameState.ts';
import {
  shouldStartIceSlide,
  snapPositionOnRotate,
  tankMoveDelta,
} from './tankMotion.ts';

// ---- tankMoveDelta -------------------------------------------------------

describe('tankMoveDelta', () => {
  it('Up moves toward larger y (y-up world convention, matches stepBullet)', () => {
    const { dx, dy } = tankMoveDelta(Dir.Up, 240, 1 / 60);
    assert.equal(dx, 0);
    assert.equal(dy, 240 / 60);
  });

  it('Down moves toward smaller y', () => {
    const { dx, dy } = tankMoveDelta(Dir.Down, 240, 1 / 60);
    assert.equal(dx, 0);
    assert.equal(dy, -240 / 60);
  });

  it('Right moves toward smaller x', () => {
    const { dx } = tankMoveDelta(Dir.Right, 120, 1 / 60);
    assert.equal(dx, -120 / 60);
  });

  it('Left moves toward larger x', () => {
    const { dx } = tankMoveDelta(Dir.Left, 120, 1 / 60);
    assert.equal(dx, 120 / 60);
  });

  it('scales linearly with speed', () => {
    const a = tankMoveDelta(Dir.Up, 100, 1 / 60);
    const b = tankMoveDelta(Dir.Up, 200, 1 / 60);
    assert.equal(b.dy, 2 * a.dy);
  });

  it('scales linearly with dt', () => {
    const a = tankMoveDelta(Dir.Up, 240, 1 / 60);
    const b = tankMoveDelta(Dir.Up, 240, 2 / 60);
    assert.equal(b.dy, 2 * a.dy);
  });
});

// ---- snapPositionOnRotate ------------------------------------------------

describe('snapPositionOnRotate', () => {
  it('no-op when new rotation equals old', () => {
    const out = snapPositionOnRotate(101, 203, Dir.Up, Dir.Up, 32);
    assert.deepEqual(out, { x: 101, y: 203 });
  });

  it('Up: snaps x to nearest tile, leaves y alone', () => {
    const out = snapPositionOnRotate(100.4, 203, Dir.Right, Dir.Up, 32);
    assert.equal(out.x, 96);  // nearest 32-multiple
    assert.equal(out.y, 203);
  });

  it('Down: snaps x to nearest tile', () => {
    const out = snapPositionOnRotate(115.5, 203, Dir.Left, Dir.Down, 32);
    // 115.5 / 32 = 3.609 → round to 4 → 128
    assert.equal(out.x, 128);
    assert.equal(out.y, 203);
  });

  it('Left: snaps y to nearest tile, leaves x alone', () => {
    const out = snapPositionOnRotate(101, 50.1, Dir.Up, Dir.Left, 32);
    assert.equal(out.x, 101);
    assert.equal(out.y, 64);  // nearest 32-multiple
  });

  it('Right: snaps y', () => {
    const out = snapPositionOnRotate(101, 48, Dir.Down, Dir.Right, 32);
    assert.equal(out.y, 64);
  });

  it('snaps positions already at a tile boundary to themselves', () => {
    const out = snapPositionOnRotate(96, 128, Dir.Right, Dir.Up, 32);
    assert.deepEqual(out, { x: 96, y: 128 });
  });

  it('is pure — returns a fresh object, does not mutate', () => {
    const a = snapPositionOnRotate(100, 200, Dir.Up, Dir.Right, 32);
    const b = snapPositionOnRotate(100, 200, Dir.Up, Dir.Right, 32);
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
  });
});

// ---- shouldStartIceSlide ------------------------------------------------

describe('shouldStartIceSlide', () => {
  it('true only when all four conditions hold', () => {
    assert.equal(shouldStartIceSlide(true, true, true, false), true);
  });

  it('false when checkIce is false (programmatic idle suppresses slide)', () => {
    assert.equal(shouldStartIceSlide(false, true, true, false), false);
  });

  it('false for enemy tanks (ice slide is player-only)', () => {
    assert.equal(shouldStartIceSlide(true, false, true, false), false);
  });

  it('false when tank is not on ice', () => {
    assert.equal(shouldStartIceSlide(true, true, false, false), false);
  });

  it('false when already sliding (no slide stacking)', () => {
    assert.equal(shouldStartIceSlide(true, true, true, true), false);
  });
});
