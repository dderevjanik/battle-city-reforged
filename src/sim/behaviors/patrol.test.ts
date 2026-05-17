import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Dir } from '../GameState.ts';
import { initPatrol, stepPatrol } from './patrol.ts';

describe('stepPatrol', () => {
  it('initial state has no last position', () => {
    const s = initPatrol();
    assert.equal(s.lastX, null);
    assert.equal(s.lastY, null);
  });

  it('on first tick: records position, decides to move, no rotate', () => {
    const { state, decision } = stepPatrol(initPatrol(), {
      x: 100, y: 200, rotation: Dir.Up,
    });
    assert.equal(state.lastX, 100);
    assert.equal(state.lastY, 200);
    assert.deepEqual(decision, { rotate: null, move: true, secondMove: false });
  });

  it('when position changes: records new position, no rotate', () => {
    const prev = { lastX: 100, lastY: 200 };
    const { state, decision } = stepPatrol(prev, {
      x: 100, y: 205, rotation: Dir.Up,
    });
    assert.equal(state.lastY, 205);
    assert.equal(decision.rotate, null);
    assert.equal(decision.secondMove, false);
  });

  it('when stuck: reverses direction (Up → Down)', () => {
    const prev = { lastX: 100, lastY: 200 };
    const { decision } = stepPatrol(prev, {
      x: 100, y: 200, rotation: Dir.Up,
    });
    assert.equal(decision.rotate, Dir.Down);
    assert.equal(decision.move, true);
    assert.equal(decision.secondMove, true);
  });

  it('reverses Down → Up, Left → Right, Right → Left', () => {
    const stuckAt = (rotation: Dir) =>
      stepPatrol({ lastX: 0, lastY: 0 }, { x: 0, y: 0, rotation }).decision.rotate;
    assert.equal(stuckAt(Dir.Down), Dir.Up);
    assert.equal(stuckAt(Dir.Left), Dir.Right);
    assert.equal(stuckAt(Dir.Right), Dir.Left);
  });

  it('does NOT update lastPosition while stuck (parity invariant)', () => {
    // Critical for behavioral parity with the legacy class. If this changes,
    // tanks will flip-flop instead of pushing through obstacles.
    const prev = { lastX: 50, lastY: 50 };
    const { state } = stepPatrol(prev, { x: 50, y: 50, rotation: Dir.Up });
    assert.equal(state.lastX, 50);
    assert.equal(state.lastY, 50);
    assert.equal(state, prev); // returned the exact same state object
  });

  it('rounds sub-pixel positions to integers for the stuck check', () => {
    // The stuck check must ignore subpixel jitter — two ticks with the same
    // rounded position should still register as stuck even if floats
    // disagree by < 0.5 px.
    const prev = { lastX: 100, lastY: 200 };
    const { decision } = stepPatrol(prev, {
      x: 100.4, y: 199.6, rotation: Dir.Up,
    });
    assert.equal(decision.rotate, Dir.Down);
  });

  it('is pure: does not mutate input state on either branch', () => {
    const prev = { lastX: 100, lastY: 200 };
    const frozenBefore = { ...prev };

    stepPatrol(prev, { x: 100, y: 200, rotation: Dir.Up });  // stuck
    assert.deepEqual(prev, frozenBefore);

    stepPatrol(prev, { x: 0, y: 0, rotation: Dir.Up });      // moved
    assert.deepEqual(prev, frozenBefore);
  });
});
