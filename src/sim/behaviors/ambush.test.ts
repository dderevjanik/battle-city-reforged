import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Dir } from '../GameState.ts';
import { projectAmbushTarget } from './ambush.ts';

describe('projectAmbushTarget', () => {
  it('projects upward (screen-coord): Up subtracts from y', () => {
    assert.deepEqual(
      projectAmbushTarget(100, 200, Dir.Up, 64),
      { x: 100, y: 136 },
    );
  });

  it('projects downward: Down adds to y', () => {
    assert.deepEqual(
      projectAmbushTarget(100, 200, Dir.Down, 64),
      { x: 100, y: 264 },
    );
  });

  it('projects leftward: Left subtracts from x', () => {
    assert.deepEqual(
      projectAmbushTarget(100, 200, Dir.Left, 64),
      { x: 36, y: 200 },
    );
  });

  it('projects rightward: Right adds to x', () => {
    assert.deepEqual(
      projectAmbushTarget(100, 200, Dir.Right, 64),
      { x: 164, y: 200 },
    );
  });

  it('zero offset returns the original point unchanged', () => {
    assert.deepEqual(
      projectAmbushTarget(100, 200, Dir.Up, 0),
      { x: 100, y: 200 },
    );
  });

  it('is pure — does not mutate inputs (returns a fresh object)', () => {
    const a = projectAmbushTarget(0, 0, Dir.Up, 50);
    const b = projectAmbushTarget(0, 0, Dir.Up, 50);
    assert.notEqual(a, b, 'each call should return a new object');
    assert.deepEqual(a, b, 'but the contents should match');
  });

  it('legacy parity: screen-coord Up = subtract y (opposite of stepBullet)', () => {
    // stepBullet treats Up as +y (world y-up); ambush treats Up as -y
    // (screen y-down). This sign disagreement is deliberate — it's how the
    // legacy game shipped, and changing it would shift every ambush target.
    const target = projectAmbushTarget(100, 100, Dir.Up, 100);
    assert.ok(target.y < 100, 'screen-coord Up means smaller y');
  });
});
