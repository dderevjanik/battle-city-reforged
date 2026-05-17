import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Random } from '../../core/Random.ts';
import { initBomber, stepBomber } from './bomber.ts';

describe('initBomber', () => {
  it('rolls an initial timer in [3, 8) seconds → [180, 480) ticks', () => {
    for (let seed = 1; seed < 50; seed++) {
      const s = initBomber(new Random(seed));
      assert.ok(s.bombTicksLeft >= 180 && s.bombTicksLeft < 481, `out of range: ${s.bombTicksLeft}`);
      assert.equal(s.hasDroppedBomb, false);
    }
  });

  it('is deterministic per seed', () => {
    const a = initBomber(new Random(42));
    const b = initBomber(new Random(42));
    assert.deepEqual(a, b);
  });
});

describe('stepBomber', () => {
  it('decrements when timer is not yet due, no RNG consumption', () => {
    const r = new Random(1);
    const before = r.getState();
    const { state, dropBomb } = stepBomber(
      { bombTicksLeft: 100, hasDroppedBomb: false },
      r,
    );
    assert.equal(dropBomb, false);
    assert.equal(state.bombTicksLeft, 99);
    assert.equal(r.getState(), before);
  });

  it('drops the bomb on the tick the timer expires and rerolls', () => {
    const r = new Random(7);
    const { state, dropBomb } = stepBomber(
      { bombTicksLeft: 1, hasDroppedBomb: false },
      r,
    );
    assert.equal(dropBomb, true);
    assert.equal(state.hasDroppedBomb, true);
    assert.ok(state.bombTicksLeft >= 180, 'new delay should be at least 3 sec');
  });

  it('sets hasDroppedBomb=true permanently across drops', () => {
    let s = { bombTicksLeft: 1, hasDroppedBomb: false };
    s = stepBomber(s, new Random(1)).state;
    s = stepBomber(s, new Random(1)).state; // not dropping this tick
    assert.equal(s.hasDroppedBomb, true);
  });

  it('is pure — input state unchanged after call', () => {
    const before = { bombTicksLeft: 50, hasDroppedBomb: false };
    const frozen = { ...before };
    stepBomber(before, new Random(1));
    assert.deepEqual(before, frozen);
  });
});
