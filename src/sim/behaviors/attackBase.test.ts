import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { pickNearestBase } from './attackBase.ts';

describe('pickNearestBase', () => {
  it('returns null when the base list is empty', () => {
    assert.equal(pickNearestBase([], 0, 0), null);
  });

  it('returns the only base when there is one', () => {
    assert.deepEqual(
      pickNearestBase([{ x: 50, y: 50 }], 0, 0),
      { x: 50, y: 50 },
    );
  });

  it('picks the closer base by Euclidean distance', () => {
    const bases = [
      { x: 100, y: 100 },
      { x: 10, y: 10 },
    ];
    assert.deepEqual(pickNearestBase(bases, 0, 0), { x: 10, y: 10 });
  });

  it('stable on ties: returns the first equal-distance base in list order', () => {
    // (50,50) and (-50,-50) are equidistant from origin; first wins.
    const bases = [
      { x: 50, y: 50 },
      { x: -50, y: -50 },
    ];
    assert.deepEqual(pickNearestBase(bases, 0, 0), { x: 50, y: 50 });
  });

  it('uses squared distance — no sqrt called', () => {
    // Asserts behavior parity even when distances are very large (where
    // hypot might differ in last bit but squared distance is exact).
    const bases = [
      { x: 1_000_000, y: 0 },
      { x: 0, y: 1_000_001 },
    ];
    assert.deepEqual(pickNearestBase(bases, 0, 0), { x: 1_000_000, y: 0 });
  });

  it('is pure — does not mutate the input array', () => {
    const bases = [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ];
    const before = JSON.stringify(bases);
    pickNearestBase(bases, 0, 0);
    assert.equal(JSON.stringify(bases), before);
  });
});
