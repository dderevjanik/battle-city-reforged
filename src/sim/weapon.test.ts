import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  afterFire,
  canFire,
  initWeapon,
  tickWeapon,
} from './weapon.ts';

describe('canFire', () => {
  it('permits fire when at zero cooldown with room in the bullet cap', () => {
    assert.equal(canFire(initWeapon(), 0, 1), true);
  });

  it('blocks when bullet cap is reached (strict >=)', () => {
    assert.equal(canFire(initWeapon(), 1, 1), false);
  });

  it('blocks when bullet cap is exceeded (defensive)', () => {
    assert.equal(canFire(initWeapon(), 2, 1), false);
  });

  it('blocks while cooldown is active', () => {
    assert.equal(canFire({ cooldownTicksLeft: 5 }, 0, 1), false);
  });

  it('permits exactly when cooldown reaches zero', () => {
    assert.equal(canFire({ cooldownTicksLeft: 0 }, 0, 1), true);
  });

  it('multi-bullet tanks: permits when below the higher cap', () => {
    assert.equal(canFire(initWeapon(), 1, 2), true);
    assert.equal(canFire(initWeapon(), 2, 2), false);
  });
});

describe('tickWeapon', () => {
  it('decrements cooldown by one tick per call', () => {
    let s = { cooldownTicksLeft: 5 };
    s = tickWeapon(s);
    assert.equal(s.cooldownTicksLeft, 4);
    s = tickWeapon(s);
    assert.equal(s.cooldownTicksLeft, 3);
  });

  it('clamps at zero (idempotent at floor)', () => {
    const s = { cooldownTicksLeft: 0 };
    const next = tickWeapon(s);
    assert.equal(next.cooldownTicksLeft, 0);
    // Returns the SAME object — no spurious allocations or mutation.
    assert.equal(next, s);
  });

  it('reaches zero exactly N ticks after starting from N', () => {
    let s = { cooldownTicksLeft: 10 };
    for (let i = 0; i < 10; i++) s = tickWeapon(s);
    assert.equal(s.cooldownTicksLeft, 0);
    assert.equal(canFire(s, 0, 1), true);
  });
});

describe('afterFire', () => {
  it('sets cooldown from rapid-fire delay in seconds', () => {
    assert.equal(afterFire(initWeapon(), 0.5).cooldownTicksLeft, 30);
    assert.equal(afterFire(initWeapon(), 1).cooldownTicksLeft, 60);
  });

  it('clamps to a minimum of 1 tick (no zero-cooldown rapid fire)', () => {
    // Sub-tick delays still cost at least one tick — prevents an unbounded
    // burst rate in the unlikely event a tank ships with delay=0.
    assert.equal(afterFire(initWeapon(), 0).cooldownTicksLeft, 1);
  });
});

describe('weapon — full fire/cooldown cycle', () => {
  it('canFire flips false after fire and back true after enough ticks', () => {
    let s = initWeapon();
    assert.equal(canFire(s, 0, 1), true);

    s = afterFire(s, 0.5);  // 30-tick cooldown
    assert.equal(canFire(s, 0, 1), false);

    for (let i = 0; i < 29; i++) s = tickWeapon(s);
    assert.equal(canFire(s, 0, 1), false);

    s = tickWeapon(s);
    assert.equal(canFire(s, 0, 1), true);
  });

  it('is pure — afterFire and tickWeapon do not mutate inputs', () => {
    const before = { cooldownTicksLeft: 5 };
    const frozen = { ...before };
    tickWeapon(before);
    afterFire(before, 0.5);
    assert.deepEqual(before, frozen);
  });
});
