import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Side } from './GameState.ts';
import { BulletHitInput, classifyBulletHit } from './bulletHit.ts';

const baseInput = (over: Partial<BulletHitInput> = {}): BulletHitInput => ({
  isSelfBullet: false,
  hasShield: false,
  bulletSide: Side.Enemy,
  tankSide: Side.Player,
  friendlyFireEnabled: false,
  alreadyStunned: false,
  ...over,
});

describe('classifyBulletHit', () => {
  it('self-bullet wins over every other check (no friendly fire from own gun)', () => {
    assert.equal(
      classifyBulletHit(baseInput({ isSelfBullet: true, hasShield: true })),
      'self-bullet',
    );
    assert.equal(
      classifyBulletHit(baseInput({ isSelfBullet: true, friendlyFireEnabled: true })),
      'self-bullet',
    );
  });

  it('shield absorbs (when not self-bullet)', () => {
    assert.equal(
      classifyBulletHit(baseInput({ hasShield: true })),
      'shield-absorbs',
    );
  });

  it('enemy bullet passes through enemy tank', () => {
    assert.equal(
      classifyBulletHit(baseInput({
        bulletSide: Side.Enemy,
        tankSide: Side.Enemy,
      })),
      'enemy-vs-enemy',
    );
  });

  it('player bullet on enemy tank → damage', () => {
    assert.equal(
      classifyBulletHit(baseInput({
        bulletSide: Side.Player,
        tankSide: Side.Enemy,
      })),
      'damage',
    );
  });

  it('enemy bullet on player tank → damage', () => {
    assert.equal(
      classifyBulletHit(baseInput({
        bulletSide: Side.Enemy,
        tankSide: Side.Player,
      })),
      'damage',
    );
  });

  describe('friendly fire (player on player)', () => {
    const ff = (over: Partial<BulletHitInput> = {}) =>
      classifyBulletHit(baseInput({
        bulletSide: Side.Player,
        tankSide: Side.Player,
        ...over,
      }));

    it('disabled: bullet absorbed (FF off)', () => {
      assert.equal(ff({ friendlyFireEnabled: false }), 'friendly-fire-disabled');
    });

    it('enabled + not stunned → stun', () => {
      assert.equal(
        ff({ friendlyFireEnabled: true, alreadyStunned: false }),
        'friendly-fire-stun',
      );
    });

    it('enabled + already stunned → bullet explodes but no re-stun', () => {
      assert.equal(
        ff({ friendlyFireEnabled: true, alreadyStunned: true }),
        'friendly-fire-already-stunned',
      );
    });

    it('shield trumps friendly fire', () => {
      assert.equal(
        ff({ friendlyFireEnabled: true, hasShield: true }),
        'shield-absorbs',
      );
    });
  });
});
