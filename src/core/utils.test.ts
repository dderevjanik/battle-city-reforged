import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ArrayUtils, MathUtils, NumberUtils, RandomUtils } from './utils.ts';

describe('MathUtils', () => {
  it('round() with default precisionExp=10 rounds to 2 decimals (precision=100)', () => {
    assert.equal(MathUtils.round(1.234567891234), 1.23);
    assert.equal(MathUtils.round(1), 1);
    assert.equal(MathUtils.round(0), 0);
  });

  it('round() trims floating-point noise near zero', () => {
    // `+ 0` normalizes signed zero (-0 → 0) so strict equality matches.
    assert.equal(MathUtils.round(1.2246467991473532e-16) + 0, 0);
    assert.equal(MathUtils.round(-1.2246467991473532e-16) + 0, 0);
  });

  it('round() with smaller precisionExp reduces digits', () => {
    // precisionExp=1 → precision=10 → 1 decimal place
    assert.equal(MathUtils.round(1.23456, 1), 1.2);
    // precisionExp=10 (default) → precision=100 → 2 decimals
    assert.equal(MathUtils.round(1.23456, 10), 1.23);
  });

  it('degreesToRadians() converts at known angles', () => {
    assert.equal(MathUtils.degreesToRadians(0), 0);
    assert.equal(MathUtils.degreesToRadians(180), Math.PI);
    assert.equal(MathUtils.degreesToRadians(360), Math.PI * 2);
  });

  it('radiansToDegrees() is the inverse of degreesToRadians()', () => {
    for (const deg of [0, 45, 90, 180, 270, 360]) {
      const round = MathUtils.radiansToDegrees(MathUtils.degreesToRadians(deg));
      assert.ok(Math.abs(round - deg) < 1e-9);
    }
  });

  it('cosDegrees() returns clean values at cardinal angles', () => {
    assert.equal(MathUtils.cosDegrees(0), 1);
    assert.equal(MathUtils.cosDegrees(90) + 0, 0);
    assert.equal(MathUtils.cosDegrees(180), -1);
    assert.equal(MathUtils.cosDegrees(270) + 0, 0);
  });

  it('sinDegrees() returns clean values at cardinal angles', () => {
    assert.equal(MathUtils.sinDegrees(0) + 0, 0);
    assert.equal(MathUtils.sinDegrees(90), 1);
    assert.equal(MathUtils.sinDegrees(180) + 0, 0);
    assert.equal(MathUtils.sinDegrees(270), -1);
  });

  it('atan2Degrees() recovers angles in degrees', () => {
    assert.equal(MathUtils.atan2Degrees(0, 1), 0);
    assert.equal(MathUtils.atan2Degrees(1, 0), 90);
    assert.equal(MathUtils.atan2Degrees(0, -1), 180);
    assert.equal(MathUtils.atan2Degrees(-1, 0), -90);
  });
});

describe('ArrayUtils.flatten', () => {
  it('flattens one level of nesting', () => {
    assert.deepEqual(ArrayUtils.flatten([1, [2, 3], 4]), [1, 2, 3, 4]);
  });

  it('handles an empty input', () => {
    assert.deepEqual(ArrayUtils.flatten([]), []);
  });

  it('handles arrays with no nesting', () => {
    assert.deepEqual(ArrayUtils.flatten([1, 2, 3]), [1, 2, 3]);
  });

  it('handles arrays with empty nested arrays', () => {
    assert.deepEqual(ArrayUtils.flatten([1, [], 2]), [1, 2]);
  });

  it('does not flatten beyond one level (single-level only)', () => {
    const nested = [1, [2, [3, 4]], 5];
    assert.deepEqual(ArrayUtils.flatten(nested as never), [1, 2, [3, 4], 5]);
  });
});

describe('NumberUtils.clamp', () => {
  it('returns the value when within range', () => {
    assert.equal(NumberUtils.clamp(5, 0, 10), 5);
  });

  it('clamps below the minimum', () => {
    assert.equal(NumberUtils.clamp(-1, 0, 10), 0);
  });

  it('clamps above the maximum', () => {
    assert.equal(NumberUtils.clamp(15, 0, 10), 10);
  });

  it('handles equal min and max', () => {
    assert.equal(NumberUtils.clamp(5, 7, 7), 7);
  });

  it('works with negative ranges', () => {
    assert.equal(NumberUtils.clamp(-5, -10, -2), -5);
    assert.equal(NumberUtils.clamp(-15, -10, -2), -10);
    assert.equal(NumberUtils.clamp(0, -10, -2), -2);
  });
});

describe('RandomUtils', () => {
  it('number() stays within [min, max) for any rng output', () => {
    for (let i = 0; i < 50; i += 1) {
      const n = RandomUtils.number(5, 10);
      assert.ok(n >= 5 && n < 10, `out of range: ${n}`);
      assert.equal(Number.isInteger(n), true);
    }
  });

  it('number() with default range returns 0..99 integer', () => {
    for (let i = 0; i < 50; i += 1) {
      const n = RandomUtils.number();
      assert.ok(n >= 0 && n < 100);
    }
  });

  it('arrayElement() always returns an element of the input array', () => {
    const values = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 50; i += 1) {
      const v = RandomUtils.arrayElement(values);
      assert.ok(values.includes(v));
    }
  });

  it('probability(100) is always true; probability(0) is always false', () => {
    for (let i = 0; i < 20; i += 1) {
      assert.equal(RandomUtils.probability(100), true);
      assert.equal(RandomUtils.probability(0), false);
    }
  });
});
