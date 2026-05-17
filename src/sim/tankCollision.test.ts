import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Box } from './wallHit.ts';
import { isOnIce, minkowskiResolve } from './tankCollision.ts';

const box = (x1: number, y1: number, x2: number, y2: number): Box => ({
  min: { x: x1, y: y1 },
  max: { x: x2, y: y2 },
});

// ---- isOnIce -------------------------------------------------------------

describe('isOnIce', () => {
  it('returns false with no ice contacts', () => {
    assert.equal(isOnIce(box(0, 0, 64, 64), []), false);
  });

  it('returns true when tank center is inside a single ice tile', () => {
    const tank = box(0, 0, 64, 64); // center 32,32
    assert.equal(isOnIce(tank, [box(0, 0, 64, 64)]), true);
  });

  it('returns false when tank center is outside the union', () => {
    const tank = box(0, 0, 64, 64); // center 32,32
    // Ice tile is east of tank, doesn't contain center.
    assert.equal(isOnIce(tank, [box(100, 100, 200, 200)]), false);
  });

  it('returns true when center is inside the UNION of multiple tiles', () => {
    const tank = box(0, 0, 64, 64); // center 32,32
    // Two non-overlapping tiles whose bounding union (= 0..96, 0..96) does contain center.
    assert.equal(
      isOnIce(tank, [box(0, 0, 32, 32), box(64, 64, 96, 96)]),
      true,
    );
  });

  it('boundary inclusivity: center on union edge IS on ice', () => {
    // Center 32,32 on the max edge of the ice tile (32, 32).
    assert.equal(isOnIce(box(0, 0, 64, 64), [box(0, 0, 32, 32)]), true);
  });
});

// ---- minkowskiResolve ----------------------------------------------------

describe('minkowskiResolve', () => {
  // 32×32 tank centered at varying positions; 32×32 wall at fixed (50,50).
  const wall = box(50, 50, 82, 82);

  // Game uses y-up world. "side" names the face of the OTHER box we hit:
  // approaching from above (larger y) → hits the "top" face of the wall.
  it('hits "top" of wall when approaching from above (y-up)', () => {
    const selfPrev = box(50, 90, 82, 122);   // center (66, 106) above wall
    const selfCurrent = box(50, 75, 82, 107); // overlapping wall (50..82)
    const r = minkowskiResolve(selfCurrent, selfPrev, wall);
    assert.equal(r.side, 'top');
    assert.equal(r.dx, 0);
    assert.equal(r.dy, selfCurrent.min.y - wall.max.y);
  });

  it('hits "bottom" of wall when approaching from below', () => {
    const selfPrev = box(50, 20, 82, 52);   // center (66, 36) below wall
    const selfCurrent = box(50, 35, 82, 67); // overlapping
    const r = minkowskiResolve(selfCurrent, selfPrev, wall);
    assert.equal(r.side, 'bottom');
    assert.equal(r.dy, selfCurrent.max.y - wall.min.y);
  });

  // X-axis labels are LEGACY-INVERTED — see the WallSide doc on
  // minkowskiResolve. Approached-from-larger-x → 'left'; approached-from-
  // smaller-x → 'right'. Asserting the legacy convention so any rename
  // attempt has to update tests in lockstep.
  it('"left" when approaching from larger x (legacy inverted X naming)', () => {
    const selfPrev = box(120, 50, 152, 82); // center (136, 66) — larger x
    const selfCurrent = box(75, 50, 107, 82);
    const r = minkowskiResolve(selfCurrent, selfPrev, wall);
    assert.equal(r.side, 'left');
    assert.equal(r.dx, selfCurrent.min.x - wall.max.x);
    assert.equal(r.dy, 0);
  });

  it('"right" when approaching from smaller x (legacy inverted X naming)', () => {
    const selfPrev = box(0, 50, 32, 82);    // center (16, 66) — smaller x
    const selfCurrent = box(35, 50, 67, 82);
    const r = minkowskiResolve(selfCurrent, selfPrev, wall);
    assert.equal(r.side, 'right');
    assert.equal(r.dx, selfCurrent.max.x - wall.min.x);
  });

  it('returns "none" when centers coincide (degenerate)', () => {
    const sameCenter = box(50, 50, 82, 82);
    const r = minkowskiResolve(sameCenter, sameCenter, wall);
    assert.equal(r.side, 'none');
    assert.equal(r.dx, 0);
    assert.equal(r.dy, 0);
  });

  it('is pure — does not mutate inputs', () => {
    const a = box(0, 0, 32, 32);
    const b = box(20, 0, 52, 32);
    const c = box(30, 0, 62, 32);
    const frozenA = JSON.stringify(a);
    minkowskiResolve(c, b, a);
    assert.equal(JSON.stringify(a), frozenA);
  });
});
