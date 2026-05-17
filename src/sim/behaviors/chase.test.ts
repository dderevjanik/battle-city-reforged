import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Random } from '../../core/Random.ts';
import { Dir } from '../GameState.ts';
import {
  ChaseMode,
  chasePhaseDecide,
  chasePhaseFire,
  chasePhaseStuck,
  initChase,
  pickBestRotation,
  pickChaseRotation,
  scoreRotation,
} from './chase.ts';

const fixedRand = () => new Random(0xc0ffee);

const obs = (over: Partial<{
  x: number; y: number; rotation: Dir; targetX: number | null; targetY: number | null;
}> = {}) => ({
  x: 100,
  y: 100,
  rotation: Dir.Up,
  targetX: 400 as number | null,
  targetY: 400 as number | null,
  ...over,
});

// ---- Pure helpers ---------------------------------------------------------

describe('scoreRotation', () => {
  it('Right scores positive when target is east', () => {
    assert.equal(scoreRotation(Dir.Right, 50, 0), 50);
    assert.equal(scoreRotation(Dir.Right, -50, 0), -50);
  });
  it('Left is the negation of Right (mirror symmetry)', () => {
    assert.equal(scoreRotation(Dir.Left, 50, 0), -scoreRotation(Dir.Right, 50, 0));
  });
  it('Down scores positive when target is below (screen-coord legacy)', () => {
    assert.equal(scoreRotation(Dir.Down, 0, 80), 80);
  });
  it('Up is the negation of Down', () => {
    assert.equal(scoreRotation(Dir.Up, 0, 80), -scoreRotation(Dir.Down, 0, 80));
  });
});

describe('pickBestRotation', () => {
  it('picks Right when target is purely east', () => {
    assert.equal(pickBestRotation([Dir.Up, Dir.Right, Dir.Down, Dir.Left], 100, 0), Dir.Right);
  });
  it('picks Down when target is purely south (screen-down)', () => {
    assert.equal(pickBestRotation([Dir.Up, Dir.Right, Dir.Down, Dir.Left], 0, 100), Dir.Down);
  });
  it('picks the diagonally-correct axis when both apply', () => {
    // Target +50 right, +100 down → Down wins (larger magnitude).
    assert.equal(pickBestRotation([Dir.Up, Dir.Right, Dir.Down, Dir.Left], 50, 100), Dir.Down);
  });
  it('respects the candidate list — won’t pick a filtered direction', () => {
    // Target is east, but Right is excluded → falls back to next best.
    const picked = pickBestRotation([Dir.Up, Dir.Down, Dir.Left], 100, 0);
    assert.notEqual(picked, Dir.Right);
  });
});

describe('pickChaseRotation', () => {
  it('uses chase scoring when player coords are known', () => {
    const r = fixedRand();
    const before = r.getState();
    const result = pickChaseRotation(
      r,
      [Dir.Up, Dir.Right, Dir.Down, Dir.Left],
      obs({ x: 0, y: 0, targetX: 100, targetY: 0 }),
    );
    // Right is the chase direction; RNG should NOT advance.
    assert.equal(result, Dir.Right);
    assert.equal(r.getState(), before);
  });

  it('falls back to random pick when player coords are null, consuming RNG', () => {
    const r = fixedRand();
    const before = r.getState();
    pickChaseRotation(
      r,
      [Dir.Up, Dir.Right, Dir.Down, Dir.Left],
      obs({ targetX: null, targetY: null }),
    );
    // RNG advanced exactly once (one rand.pick call).
    assert.notEqual(r.getState(), before);
  });
});

// ---- Phases ---------------------------------------------------------------

describe('chasePhaseFire', () => {
  it('requests fire when timer expired and resets to >=1 tick', () => {
    const r = fixedRand();
    const { state, tryFire } = chasePhaseFire(initChase(), r);
    assert.equal(tryFire, true);
    assert.ok(state.fireTicksLeft >= 1);
  });

  it('decrements the timer when not yet due, no RNG consumption', () => {
    const r = fixedRand();
    const before = r.getState();
    const { state, tryFire } = chasePhaseFire(
      { ...initChase(), fireTicksLeft: 5 },
      r,
    );
    assert.equal(tryFire, false);
    assert.equal(state.fireTicksLeft, 4);
    assert.equal(r.getState(), before);
  });
});

describe('chasePhaseDecide', () => {
  it('Firing → Moving when fire succeeded; willMove=true', () => {
    const r = fixedRand();
    const out = chasePhaseDecide(
      { ...initChase(), mode: ChaseMode.Firing },
      obs(),
      true,
      r,
    );
    assert.equal(out.state.mode, ChaseMode.Moving);
    assert.equal(out.willMove, true);
  });

  it('stays in Firing when fire failed', () => {
    const r = fixedRand();
    const out = chasePhaseDecide(
      { ...initChase(), mode: ChaseMode.Firing },
      obs(),
      false,
      r,
    );
    assert.equal(out.state.mode, ChaseMode.Firing);
    assert.equal(out.willMove, false);
  });

  it('decrements thinkTicksLeft while Thinking', () => {
    const r = fixedRand();
    const out = chasePhaseDecide(
      { ...initChase(), mode: ChaseMode.Thinking, thinkTicksLeft: 5 },
      obs(),
      false,
      r,
    );
    assert.equal(out.state.thinkTicksLeft, 4);
    assert.equal(out.willMove, false);
  });

  it('on think-expiry: when stuck-fire fails, picks a non-current rotation', () => {
    // Seed where rand.probability(30) returns false to force the rotation path.
    // Try multiple seeds to find one — easier than computing analytically.
    for (let seed = 1; seed < 200; seed++) {
      const r = new Random(seed);
      const out = chasePhaseDecide(
        { ...initChase(), mode: ChaseMode.Thinking, thinkTicksLeft: 0 },
        obs({ rotation: Dir.Up, targetX: 200, targetY: 200 }),
        false,
        r,
      );
      if (out.state.mode === ChaseMode.Moving) {
        assert.notEqual(out.rotate, Dir.Up);
        assert.notEqual(out.rotate, null);
        return;
      }
    }
    assert.fail('Did not find a seed exercising the non-fire path');
  });
});

describe('chasePhaseStuck', () => {
  it('flips Moving → Thinking when post-move position unchanged', () => {
    const r = fixedRand();
    const before = { ...initChase(), mode: ChaseMode.Moving, lastX: 100, lastY: 100 };
    const { state, rotate } = chasePhaseStuck(before, obs({ x: 100, y: 100 }), r);
    assert.equal(state.mode, ChaseMode.Thinking);
    assert.equal(rotate, null);
    assert.ok(state.thinkTicksLeft > 0);
  });

  it('fires periodic redirect when redirect timer expires', () => {
    const r = fixedRand();
    const before = {
      ...initChase(),
      mode: ChaseMode.Moving,
      lastX: 0, lastY: 0,
      redirectTicksLeft: 0,
    };
    const { state, rotate } = chasePhaseStuck(
      before,
      obs({ x: 50, y: 50, targetX: 200, targetY: 50 }),
      r,
    );
    assert.equal(rotate, Dir.Right); // chase eastward
    assert.ok(state.redirectTicksLeft > 0, 'redirect should reset');
  });

  it('decrements redirect timer when not yet due', () => {
    const r = fixedRand();
    const before = {
      ...initChase(),
      mode: ChaseMode.Moving,
      lastX: 0, lastY: 0,
      redirectTicksLeft: 10,
    };
    const { state, rotate } = chasePhaseStuck(before, obs({ x: 5, y: 5 }), r);
    assert.equal(rotate, null);
    assert.equal(state.redirectTicksLeft, 9);
  });

  it('is a no-op when not in Moving mode', () => {
    const r = fixedRand();
    const before = { ...initChase(), mode: ChaseMode.Firing };
    const { state, rotate } = chasePhaseStuck(before, obs(), r);
    assert.equal(rotate, null);
    assert.deepEqual(state, before);
  });
});

describe('Chase multi-tick determinism', () => {
  it('two runs with the same seed produce identical state sequences', () => {
    function run(seed: number) {
      const r = new Random(seed);
      let state = initChase();
      const trace: number[] = [];
      for (let tick = 0; tick < 300; tick++) {
        const fire = chasePhaseFire(state, r);
        state = fire.state;
        const hadFired = fire.tryFire && tick % 4 === 0;

        const observation = obs({
          x: tick * 2,
          y: tick,
          rotation: (tick % 4) as Dir,
          targetX: 400,
          targetY: 400,
        });

        const decide = chasePhaseDecide(state, observation, hadFired, r);
        state = decide.state;

        if (decide.willMove) {
          const stuck = chasePhaseStuck(
            state,
            { ...observation, x: observation.x + 5, y: observation.y + 5 },
            r,
          );
          state = stuck.state;
        }
        trace.push(state.mode, state.thinkTicksLeft, state.fireTicksLeft, state.redirectTicksLeft);
      }
      return trace;
    }

    assert.deepEqual(run(0xc0ffee), run(0xc0ffee));
  });
});
