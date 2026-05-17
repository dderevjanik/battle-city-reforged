import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Box } from './wallHit.ts';
import { shouldPickupPowerup } from './powerupPickup.ts';

const box = (x1: number, y1: number, x2: number, y2: number): Box => ({
  min: { x: x1, y: y1 },
  max: { x: x2, y: y2 },
});

describe('shouldPickupPowerup', () => {
  it('returns false when boxes do not touch', () => {
    const p = box(0, 0, 64, 64);
    const t = box(100, 100, 132, 132);
    assert.equal(shouldPickupPowerup(p, t), false);
  });

  it('returns false on adjacent boxes (zero-area intersection)', () => {
    const p = box(0, 0, 64, 64);
    const t = box(64, 0, 96, 64); // edges touch at x=64
    assert.equal(shouldPickupPowerup(p, t), false);
  });

  it('returns false when overlap is below threshold (16x16 strict)', () => {
    const p = box(0, 0, 64, 64);
    // Overlap of exactly 16x16 → strict `>` test fails.
    const t = box(48, 48, 80, 80);
    assert.equal(shouldPickupPowerup(p, t), false);
  });

  it('returns true when overlap exceeds threshold on BOTH axes', () => {
    const p = box(0, 0, 64, 64);
    // Overlap is 17x17 → both axes > 16.
    const t = box(47, 47, 80, 80);
    assert.equal(shouldPickupPowerup(p, t), true);
  });

  it('returns false if only one axis exceeds the threshold', () => {
    const p = box(0, 0, 64, 64);
    // 32 wide × 16 tall — width passes, height ties (strict >, fails).
    const t = box(32, 48, 64, 80);
    assert.equal(shouldPickupPowerup(p, t), false);
  });

  it('is commutative on the two box arguments', () => {
    const a = box(0, 0, 64, 64);
    const b = box(40, 40, 80, 80);
    assert.equal(shouldPickupPowerup(a, b), shouldPickupPowerup(b, a));
  });

  it('full containment is a pickup', () => {
    const p = box(0, 0, 64, 64);
    const t = box(10, 10, 50, 50); // entirely inside p
    assert.equal(shouldPickupPowerup(p, t), true);
  });
});
