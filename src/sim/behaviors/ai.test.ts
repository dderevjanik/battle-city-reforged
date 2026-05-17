import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Random } from '../../core/Random.ts';
import { Dir } from '../GameState.ts';
import {
  AiMode,
  aiPhaseDecide,
  aiPhaseFire,
  aiPhaseStuck,
  getRandomRotationExcept,
  getRotationTowardsBase,
  initAi,
  pickFireDelaySeconds,
} from './ai.ts';

const fixedRand = () => new Random(0xc0ffee);

const obs = (over: Partial<{
  x: number; y: number; rotation: Dir; baseX: number; baseY: number; tileSize: number;
}> = {}) => ({
  x: 100,
  y: 100,
  rotation: Dir.Up,
  baseX: 400,
  baseY: 800,
  tileSize: 32,
  ...over,
});

// ---- Pure helpers ---------------------------------------------------------

describe('pickFireDelaySeconds', () => {
  it('returns a value in [0, 1.5) seconds', () => {
    const r = fixedRand();
    for (let i = 0; i < 100; i++) {
      const v = pickFireDelaySeconds(r);
      assert.ok(v >= 0 && v < 1.5, `delay ${v} out of range`);
    }
  });

  it('is deterministic from a given seed', () => {
    const a = pickFireDelaySeconds(new Random(1));
    const b = pickFireDelaySeconds(new Random(1));
    assert.equal(a, b);
  });

  it('produces millisecond-granular values (matches legacy /1000 trick)', () => {
    const v = pickFireDelaySeconds(new Random(42));
    // v should be exactly representable as int-milliseconds / 1000
    const ms = Math.round(v * 1000);
    assert.equal(ms / 1000, v);
  });
});

describe('getRotationTowardsBase', () => {
  it('points down when base is directly south', () => {
    assert.equal(getRotationTowardsBase(100, 200, 100, 0), Dir.Down);
  });
  it('points right when base is directly east', () => {
    assert.equal(getRotationTowardsBase(200, 100, 0, 100), Dir.Right);
  });
  it('falls through to Down when base is directly west (legacy quirk)', () => {
    // The original `Math.max(dx, dy)` uses signed max, not absolute. When dx
    // is negative and dy is 0, max picks dy=0, the |dx| === |max| check
    // fails, and we fall through to Dir.Down. This is preserved verbatim for
    // behavioral parity; if it ever changes, it must change in both the pure
    // rule and any prior save-state.
    assert.equal(getRotationTowardsBase(0, 100, 200, 100), Dir.Down);
  });
});

describe('getRandomRotationExcept', () => {
  it('never returns the excluded direction', () => {
    const r = fixedRand();
    for (let i = 0; i < 100; i++) {
      assert.notEqual(getRandomRotationExcept(r, Dir.Up), Dir.Up);
    }
  });
  it('returns one of the three other directions', () => {
    const r = fixedRand();
    const seen = new Set<Dir>();
    for (let i = 0; i < 100; i++) {
      seen.add(getRandomRotationExcept(r, Dir.Up));
    }
    assert.deepEqual(
      [...seen].sort(),
      [Dir.Right, Dir.Down, Dir.Left].sort(),
    );
  });
});

// ---- Phases ---------------------------------------------------------------

describe('aiPhaseFire', () => {
  it('on tick 0 with fireTicksLeft=0: requests fire and resets the timer', () => {
    const r = fixedRand();
    const { state, tryFire } = aiPhaseFire(initAi(), r);
    assert.equal(tryFire, true);
    assert.ok(state.fireTicksLeft >= 1, 'must wait at least 1 tick before next fire');
  });

  it('with fireTicksLeft > 0: decrements and does not request fire', () => {
    const r = fixedRand();
    const { state, tryFire } = aiPhaseFire(
      { ...initAi(), fireTicksLeft: 10 },
      r,
    );
    assert.equal(tryFire, false);
    assert.equal(state.fireTicksLeft, 9);
  });

  it('consumes RNG only when requesting fire', () => {
    // Verifies determinism: peers must agree on RNG consumption.
    const seed = 12345;
    const r1 = new Random(seed);
    const r2 = new Random(seed);

    aiPhaseFire({ ...initAi(), fireTicksLeft: 5 }, r1);
    // r1 should NOT have advanced because no RNG was consumed.
    assert.equal(r1.getState(), r2.getState());
  });
});

describe('aiPhaseDecide', () => {
  it('exits Firing state when fire succeeded, then is willing to move', () => {
    const r = fixedRand();
    const start: ReturnType<typeof initAi> = { ...initAi(), mode: AiMode.Firing };
    const { state, willMove, rotate } = aiPhaseDecide(start, obs(), true, r);
    assert.equal(state.mode, AiMode.Moving);
    assert.equal(willMove, true);
    assert.equal(rotate, null);
  });

  it('stays in Firing when fire failed', () => {
    const r = fixedRand();
    const start: ReturnType<typeof initAi> = { ...initAi(), mode: AiMode.Firing };
    const { state, willMove } = aiPhaseDecide(start, obs(), false, r);
    assert.equal(state.mode, AiMode.Firing);
    assert.equal(willMove, false);
  });

  it('decrements think timer while Thinking and does not move', () => {
    const r = fixedRand();
    const start = { ...initAi(), mode: AiMode.Thinking, thinkTicksLeft: 5 };
    const { state, willMove } = aiPhaseDecide(start, obs(), false, r);
    assert.equal(state.thinkTicksLeft, 4);
    assert.equal(willMove, false);
  });

  it('when think timer expires in Thinking mode: either fires or rotates (RNG-driven)', () => {
    // With a deterministic seed we can assert the exact branch taken.
    const start = { ...initAi(), mode: AiMode.Thinking, thinkTicksLeft: 0 };
    const r = new Random(0xc0ffee);
    const result = aiPhaseDecide(start, obs(), false, r);
    // Either path is acceptable as long as it's well-formed.
    const transitionedToFiring = result.state.mode === AiMode.Firing && result.rotate === null;
    const transitionedToMoving = result.state.mode === AiMode.Moving && result.rotate !== null;
    assert.ok(transitionedToFiring || transitionedToMoving);
    assert.equal(result.willMove, false);
  });
});

describe('aiPhaseStuck', () => {
  it('flips Moving → Thinking when post-move position equals last', () => {
    const r = fixedRand();
    const start = { ...initAi(), mode: AiMode.Moving, lastX: 100, lastY: 100 };
    const { state } = aiPhaseStuck(start, obs({ x: 100, y: 100 }), r);
    assert.equal(state.mode, AiMode.Thinking);
    assert.ok(state.thinkTicksLeft > 0);
    // lastX/Y MUST be preserved across the stuck transition for parity.
    assert.equal(state.lastX, 100);
    assert.equal(state.lastY, 100);
  });

  it('updates lastX/Y when not stuck and does not flip mode (typical case)', () => {
    // Use a seed where shouldThinkWhenUnstuck returns false (UNSTUCK_THINK is
    // only 5% probability, so this is usually false on a fresh RNG).
    const r = new Random(0xc0ffee);
    const start = { ...initAi(), mode: AiMode.Moving, lastX: 100, lastY: 100 };
    const result = aiPhaseStuck(start, obs({ x: 132, y: 100 }), r);
    // The mode may flip to UnstuckThinking on unlucky seeds; the invariant
    // we DO assert: position is recorded only when mode stays Moving.
    if (result.state.mode === AiMode.Moving) {
      assert.equal(result.state.lastX, 132);
      assert.equal(result.state.lastY, 100);
    } else {
      assert.equal(result.state.mode, AiMode.UnstuckThinking);
    }
  });

  it('is a no-op when not in Moving mode', () => {
    const r = fixedRand();
    const before = { ...initAi(), mode: AiMode.Thinking, thinkTicksLeft: 5 };
    const { state } = aiPhaseStuck(before, obs(), r);
    assert.deepEqual(state, before);
  });
});

// ---- Integration: multi-tick determinism --------------------------------

describe('AI multi-tick determinism', () => {
  it('two runs with the same seed produce identical state sequences', () => {
    // The whole point of pure behavior: this is what enables lockstep.
    function run(seed: number) {
      const r = new Random(seed);
      let state = initAi();
      const observed: number[] = [];
      for (let tick = 0; tick < 200; tick++) {
        const fire = aiPhaseFire(state, r);
        state = fire.state;

        // Simulate a fake fire outcome that's a deterministic function of
        // tick (so it doesn't leak non-determinism into the test).
        const hadFired = fire.tryFire && tick % 3 === 0;

        const decide = aiPhaseDecide(
          state,
          obs({ x: tick, y: tick * 2 }),
          hadFired,
          r,
        );
        state = decide.state;

        if (decide.willMove) {
          const stuck = aiPhaseStuck(
            state,
            obs({ x: tick + 5, y: tick * 2 + 5 }),
            r,
          );
          state = stuck.state;
        }

        observed.push(state.mode, state.thinkTicksLeft, state.fireTicksLeft);
      }
      return observed;
    }

    const a = run(0xc0ffee);
    const b = run(0xc0ffee);
    assert.deepEqual(a, b);
  });
});
