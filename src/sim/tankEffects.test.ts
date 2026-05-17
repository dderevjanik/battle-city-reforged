import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  initShield,
  initSlide,
  initStun,
  isSliding,
  isStunned,
  hasShield,
  startShield,
  startSlide,
  startStun,
  tickShield,
  tickSlide,
  tickStun,
} from './tankEffects.ts';

// ---- Slide ----------------------------------------------------------------

describe('slide', () => {
  it('starts inactive', () => {
    assert.equal(isSliding(initSlide()), false);
  });

  it('startSlide rounds seconds to ticks (≥1)', () => {
    assert.equal(startSlide(0.5).ticksLeft, 30);
    assert.equal(startSlide(1).ticksLeft, 60);
    // Sub-tick durations are clamped to at least one tick so the slide is
    // always observable.
    assert.equal(startSlide(0).ticksLeft, 1);
  });

  it('inactive when not sliding', () => {
    const { state, action } = tickSlide(initSlide(), true);
    assert.equal(action, 'inactive');
    assert.deepEqual(state, initSlide());
  });

  it('continues while on ice and ticks remain', () => {
    const { state, action } = tickSlide({ ticksLeft: 10 }, true);
    assert.equal(action, 'continue');
    assert.equal(state.ticksLeft, 9);
  });

  it('ends on the tick the timer reaches zero', () => {
    const { state, action } = tickSlide({ ticksLeft: 1 }, true);
    assert.equal(action, 'end');
    assert.equal(state.ticksLeft, 0);
  });

  it('ends immediately when off ice (parity: legacy stopped the timer + idle)', () => {
    const { state, action } = tickSlide({ ticksLeft: 50 }, false);
    assert.equal(action, 'end');
    assert.equal(state.ticksLeft, 0);
  });
});

// ---- Stun -----------------------------------------------------------------

describe('stun', () => {
  it('starts visible-false (legacy parity: setVisible(false) at trigger)', () => {
    const s = startStun(2, 0.1);
    assert.equal(s.visible, false);
    assert.equal(s.stunTicksLeft, 120);
    assert.equal(s.blinkTicksLeft, 6);
  });

  it('inactive when not stunned', () => {
    const r = tickStun(initStun(), 0.1);
    assert.equal(r.stunEnded, false);
    assert.equal(r.visibilityChanged, false);
  });

  it('flips visibility when blink timer ticks down to zero', () => {
    // ticksLeft=1 → after one decrement → 0 → flip and reset.
    const before = { stunTicksLeft: 100, blinkTicksLeft: 1, visible: false };
    const { state, visibilityChanged } = tickStun(before, 0.1);
    assert.equal(visibilityChanged, true);
    assert.equal(state.visible, true);
    // Reset to a fresh full interval (no extra decrement on the reset tick).
    assert.equal(state.blinkTicksLeft, 6);
  });

  it('decrements stunTicksLeft each tick', () => {
    const before = { stunTicksLeft: 50, blinkTicksLeft: 10, visible: false };
    const r = tickStun(before, 0.1);
    assert.equal(r.state.stunTicksLeft, 49);
    assert.equal(r.state.blinkTicksLeft, 9);
    assert.equal(r.visibilityChanged, false);
  });

  it('on stun expiry: forces visible=true and signals stunEnded', () => {
    const before = { stunTicksLeft: 1, blinkTicksLeft: 5, visible: false };
    const r = tickStun(before, 0.1);
    assert.equal(r.stunEnded, true);
    assert.equal(r.state.stunTicksLeft, 0);
    assert.equal(r.state.visible, true);
    assert.equal(r.visibilityChanged, true);
  });

  it('on stun expiry while already visible: stunEnded=true, no visibility flip', () => {
    const before = { stunTicksLeft: 1, blinkTicksLeft: 5, visible: true };
    const r = tickStun(before, 0.1);
    assert.equal(r.stunEnded, true);
    assert.equal(r.state.visible, true);
    assert.equal(r.visibilityChanged, false);
  });
});

// ---- Shield ---------------------------------------------------------------

describe('shield', () => {
  it('starts inactive', () => {
    assert.equal(hasShield(initShield()), false);
  });

  it('startShield rounds seconds to ticks', () => {
    assert.equal(startShield(5).ticksLeft, 300);
  });

  it('decrements while active', () => {
    const r = tickShield({ ticksLeft: 30 });
    assert.equal(r.state.ticksLeft, 29);
    assert.equal(r.ended, false);
  });

  it('signals ended on the tick the timer reaches zero', () => {
    const r = tickShield({ ticksLeft: 1 });
    assert.equal(r.ended, true);
    assert.equal(r.state.ticksLeft, 0);
  });

  it('idempotent once expired (no spurious re-end)', () => {
    const r = tickShield({ ticksLeft: 0 });
    assert.equal(r.ended, false);
  });
});

// ---- Purity ---------------------------------------------------------------

describe('purity', () => {
  it('tickSlide does not mutate input', () => {
    const s = { ticksLeft: 5 };
    const frozen = { ...s };
    tickSlide(s, true);
    assert.deepEqual(s, frozen);
  });

  it('tickStun does not mutate input', () => {
    const s = { stunTicksLeft: 5, blinkTicksLeft: 2, visible: false };
    const frozen = { ...s };
    tickStun(s, 0.1);
    assert.deepEqual(s, frozen);
  });

  it('tickShield does not mutate input', () => {
    const s = { ticksLeft: 5 };
    const frozen = { ...s };
    tickShield(s);
    assert.deepEqual(s, frozen);
  });
});
