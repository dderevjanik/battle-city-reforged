import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Dir } from '../GameState.ts';
import { InputBits, makeInput } from '../Input.ts';
import { stepPlayer } from './player.ts';

const idleObs = { isSliding: false, isStunned: false, isIdle: true };
const movingObs = { isSliding: false, isStunned: false, isIdle: false };

describe('stepPlayer — fire', () => {
  it('forwards Fire bit to tryFire unconditionally', () => {
    const d = stepPlayer(makeInput({ Fire: true }), idleObs);
    assert.equal(d.tryFire, true);
  });

  it('tryFire is false when no Fire bit set', () => {
    const d = stepPlayer(0, idleObs);
    assert.equal(d.tryFire, false);
  });

  it('forwards Fire even while sliding (legacy parity)', () => {
    const d = stepPlayer(
      makeInput({ Fire: true }),
      { isSliding: true, isStunned: false, isIdle: false },
    );
    assert.equal(d.tryFire, true);
    // ...but movement is suppressed.
    assert.equal(d.willMove, false);
    assert.equal(d.rotate, null);
  });
});

describe('stepPlayer — movement', () => {
  it('rotates to the held direction (single)', () => {
    assert.equal(stepPlayer(makeInput({ Up: true }), idleObs).rotate, Dir.Up);
    assert.equal(stepPlayer(makeInput({ Right: true }), idleObs).rotate, Dir.Right);
    assert.equal(stepPlayer(makeInput({ Down: true }), idleObs).rotate, Dir.Down);
    assert.equal(stepPlayer(makeInput({ Left: true }), idleObs).rotate, Dir.Left);
  });

  it('multi-direction: priority order Up > Down > Left > Right', () => {
    assert.equal(stepPlayer(makeInput({ Up: true, Down: true }), idleObs).rotate, Dir.Up);
    assert.equal(stepPlayer(makeInput({ Down: true, Left: true }), idleObs).rotate, Dir.Down);
    assert.equal(stepPlayer(makeInput({ Left: true, Right: true }), idleObs).rotate, Dir.Left);
  });

  it('moves whenever any direction is held', () => {
    assert.equal(stepPlayer(makeInput({ Up: true }), idleObs).willMove, true);
    assert.equal(stepPlayer(makeInput({ Right: true }), idleObs).willMove, true);
  });
});

describe('stepPlayer — idle transition', () => {
  it('signals willIdle on the moving → no-input edge', () => {
    const d = stepPlayer(0, movingObs);
    assert.equal(d.willIdle, true);
  });

  it('does NOT re-signal willIdle when already idle', () => {
    const d = stepPlayer(0, idleObs);
    assert.equal(d.willIdle, false);
  });

  it('willIdle is false whenever any direction is held', () => {
    const d = stepPlayer(makeInput({ Up: true }), movingObs);
    assert.equal(d.willIdle, false);
  });
});

describe('stepPlayer — disabled states', () => {
  it('sliding: no rotate, no move, no idle (but fire still works)', () => {
    const d = stepPlayer(
      makeInput({ Up: true, Fire: true }),
      { isSliding: true, isStunned: false, isIdle: false },
    );
    assert.equal(d.rotate, null);
    assert.equal(d.willMove, false);
    assert.equal(d.willIdle, false);
    assert.equal(d.tryFire, true);
  });

  it('stunned: same suppression as sliding', () => {
    const d = stepPlayer(
      makeInput({ Up: true }),
      { isSliding: false, isStunned: true, isIdle: false },
    );
    assert.equal(d.rotate, null);
    assert.equal(d.willMove, false);
  });
});

describe('stepPlayer — purity', () => {
  it('same (input, obs) yields equal decisions across calls', () => {
    const a = stepPlayer(makeInput({ Up: true, Fire: true }), movingObs);
    const b = stepPlayer(makeInput({ Up: true, Fire: true }), movingObs);
    assert.deepEqual(a, b);
  });

  it('does not mutate inputs', () => {
    const obs = { ...movingObs };
    const before = { ...obs };
    stepPlayer(0xff, obs);
    assert.deepEqual(obs, before);
  });
});
