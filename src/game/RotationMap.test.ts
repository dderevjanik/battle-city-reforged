import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { RotationMap } from './RotationMap.ts';
import { Rotation } from './Rotation.ts';

describe('RotationMap', () => {
  it('stores and retrieves values by rotation', () => {
    const map = new RotationMap<string>();
    map.set(Rotation.Up, 'up').set(Rotation.Down, 'down');

    assert.equal(map.get(Rotation.Up), 'up');
    assert.equal(map.get(Rotation.Down), 'down');
  });

  it('rounds rotation values to nearest integer', () => {
    const map = new RotationMap<number>();
    map.set(Rotation.Right, 42);

    assert.equal(map.get(89.6 as Rotation), 42);
    assert.equal(map.get(90.4 as Rotation), 42);
  });

  it('normalizes rotations greater than 360 via modulo', () => {
    const map = new RotationMap<string>();
    map.set(Rotation.Right, 'right');

    assert.equal(map.get(450 as Rotation), 'right');
  });

  it('overwrites existing entries on repeated set', () => {
    const map = new RotationMap<string>();
    map.set(Rotation.Left, 'first');
    map.set(Rotation.Left, 'second');

    assert.equal(map.get(Rotation.Left), 'second');
  });

  it('forEach visits every entry with value and rotation key', () => {
    const map = new RotationMap<string>();
    map
      .set(Rotation.Up, 'u')
      .set(Rotation.Right, 'r')
      .set(Rotation.Down, 'd')
      .set(Rotation.Left, 'l');

    const seen: Array<[number, string]> = [];
    map.forEach((value, rotation) => {
      seen.push([rotation, value]);
    });

    assert.equal(seen.length, 4);
    const sorted = seen.slice().sort((a, b) => a[0] - b[0]);
    assert.deepEqual(sorted, [
      [Rotation.Up, 'u'],
      [Rotation.Right, 'r'],
      [Rotation.Down, 'd'],
      [Rotation.Left, 'l'],
    ]);
  });

  it('set() and forEach() return this for chaining', () => {
    const map = new RotationMap<number>();
    assert.equal(map.set(Rotation.Up, 1), map);
    assert.equal(
      map.forEach(() => {}),
      map,
    );
  });

  it('returns undefined for unmapped rotations', () => {
    const map = new RotationMap<string>();
    map.set(Rotation.Up, 'only-up');

    assert.equal(map.get(Rotation.Down), undefined);
  });
});
