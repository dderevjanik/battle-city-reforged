import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Side } from './GameState.ts';
import { Box } from './wallHit.ts';
import {
  PlayerCollisionState,
  TankCollisionInput,
  TankResolution,
  decideTankCollision,
  shouldEnemyAbusePass,
  tickPlayerFsmFromUpdate,
  updatePlayerFsmDuringCollide,
} from './tankVsTank.ts';

// ---- FSM tests ------------------------------------------------------------

describe('tickPlayerFsmFromUpdate', () => {
  it('WaitCollide → NotColliding (no collide last frame = no overlap)', () => {
    assert.equal(
      tickPlayerFsmFromUpdate(PlayerCollisionState.WaitCollide),
      PlayerCollisionState.NotColliding,
    );
  });
  it('Colliding → WaitCollide (begin waiting for next collide)', () => {
    assert.equal(
      tickPlayerFsmFromUpdate(PlayerCollisionState.Colliding),
      PlayerCollisionState.WaitCollide,
    );
  });
  it('NotColliding stays NotColliding', () => {
    assert.equal(
      tickPlayerFsmFromUpdate(PlayerCollisionState.NotColliding),
      PlayerCollisionState.NotColliding,
    );
  });
});

describe('updatePlayerFsmDuringCollide', () => {
  it('only acts on WaitCollide; other states are no-ops', () => {
    assert.equal(
      updatePlayerFsmDuringCollide(PlayerCollisionState.NotColliding, true),
      PlayerCollisionState.NotColliding,
    );
    assert.equal(
      updatePlayerFsmDuringCollide(PlayerCollisionState.Colliding, true),
      PlayerCollisionState.Colliding,
    );
  });
  it('WaitCollide + player contact → Colliding', () => {
    assert.equal(
      updatePlayerFsmDuringCollide(PlayerCollisionState.WaitCollide, true),
      PlayerCollisionState.Colliding,
    );
  });
  it('WaitCollide + no player contact → NotColliding', () => {
    assert.equal(
      updatePlayerFsmDuringCollide(PlayerCollisionState.WaitCollide, false),
      PlayerCollisionState.NotColliding,
    );
  });
});

// ---- shouldEnemyAbusePass ------------------------------------------------

const box = (x1: number, y1: number, x2: number, y2: number): Box => ({
  min: { x: x1, y: y1 },
  max: { x: x2, y: y2 },
});

describe('shouldEnemyAbusePass', () => {
  // Enemy moving right onto a player that's mostly out-of-path.
  it('true when on-grid horizontally and intersection h <= threshold', () => {
    // Tank 64×64, bullet 16. Threshold = (64-16)/2 = 24.
    // Intersection height = 24 (== threshold; legacy uses <= so PASSES).
    const result = shouldEnemyAbusePass({
      selfDirection: { x: 1, y: 0 },
      selfPosX: 96,
      selfPosY: 64, // y % 32 === 0 → on-grid horizontally
      selfCurrentBox: box(96, 64, 160, 128),  // 64 tall
      otherCurrentBox: box(140, 104, 204, 168), // intersect h = 128-104 = 24
      selfTankWidth: 64,
      selfTankHeight: 64,
      bulletWidth: 16,
      tileSize: 32,
    });
    assert.equal(result, true);
  });

  it('false when off-grid (y not aligned to tile)', () => {
    const result = shouldEnemyAbusePass({
      selfDirection: { x: 1, y: 0 },
      selfPosX: 96,
      selfPosY: 50,  // 50 % 32 !== 0
      selfCurrentBox: box(96, 50, 160, 114),
      otherCurrentBox: box(140, 90, 204, 154),
      selfTankWidth: 64,
      selfTankHeight: 64,
      bulletWidth: 16,
      tileSize: 32,
    });
    assert.equal(result, false);
  });

  it('false when intersection is too large (player IS in path)', () => {
    const result = shouldEnemyAbusePass({
      selfDirection: { x: 1, y: 0 },
      selfPosX: 96,
      selfPosY: 64,
      selfCurrentBox: box(96, 64, 160, 128),
      // Full vertical overlap.
      otherCurrentBox: box(140, 64, 204, 128),
      selfTankWidth: 64,
      selfTankHeight: 64,
      bulletWidth: 16,
      tileSize: 32,
    });
    assert.equal(result, false);
  });

  it('not moving cardinally → not on grid by either axis → false', () => {
    const result = shouldEnemyAbusePass({
      selfDirection: { x: 0.5, y: 0.5 },
      selfPosX: 64,
      selfPosY: 64,
      selfCurrentBox: box(64, 64, 128, 128),
      otherCurrentBox: box(100, 100, 164, 164),
      selfTankWidth: 64,
      selfTankHeight: 64,
      bulletWidth: 16,
      tileSize: 32,
    });
    assert.equal(result, false);
  });
});

// ---- decideTankCollision -------------------------------------------------

// Convenience input builder — tiny defaults that callers can override.
const baseInput = (over: Partial<TankCollisionInput> = {}): TankCollisionInput => ({
  selfSide: Side.Player,
  otherSide: Side.Enemy,
  selfCurrentBox: box(0, 0, 64, 64),
  selfPrevBox: box(0, 0, 64, 64),
  otherCurrentBox: box(100, 0, 164, 64),
  otherPrevBox: box(100, 0, 164, 64),
  selfDirection: { x: 0, y: 0 },
  otherDirection: { x: 0, y: 0 },
  selfPosX: 0,
  selfPosY: 0,
  selfTankWidth: 64,
  selfTankHeight: 64,
  bulletWidth: 16,
  tileSize: 32,
  otherTankResolution: TankResolution.Unknown,
  selfPlayerCollisionState: PlayerCollisionState.NotColliding,
  otherPlayerCollisionState: PlayerCollisionState.NotColliding,
  hasWallCollision: false,
  selfContactsExceptOther: 0,
  otherContactsExceptSelf: 0,
  ...over,
});

describe('decideTankCollision', () => {
  it('skips when other already resolved as Self', () => {
    const r = decideTankCollision(baseInput({
      otherTankResolution: TankResolution.Self,
    }));
    assert.deepEqual(r, { kind: 'skip' });
  });

  it('skips when neither tank is moving', () => {
    const r = decideTankCollision(baseInput());
    assert.deepEqual(r, { kind: 'skip' });
  });

  it('skips when only the OTHER tank is moving', () => {
    const r = decideTankCollision(baseInput({
      otherCurrentBox: box(110, 0, 174, 64),  // other moved
    }));
    assert.deepEqual(r, { kind: 'skip' });
  });

  it('self moving alone: resolves against other prev', () => {
    const r = decideTankCollision(baseInput({
      selfCurrentBox: box(10, 0, 74, 64),  // self moved
      selfDirection: { x: 1, y: 0 },
    }));
    assert.deepEqual(r, { kind: 'resolve-against-other-prev' });
  });

  it('enemy moving through stationary player on grid with small overlap → set-player-colliding', () => {
    // Both other-prev and other-current must be identical so the "stationary
    // other" guard fires.
    const stationaryOther = box(140, 104, 204, 168);
    const r = decideTankCollision(baseInput({
      selfSide: Side.Enemy,
      otherSide: Side.Player,
      selfCurrentBox: box(96, 64, 160, 128),
      selfPrevBox: box(90, 64, 154, 128),
      otherCurrentBox: stationaryOther,
      otherPrevBox: stationaryOther,
      selfDirection: { x: 1, y: 0 },
      selfPosX: 96, selfPosY: 64,
    }));
    assert.equal(r.kind, 'set-player-colliding');
  });

  it('enemy already abusing player → skip without re-flagging', () => {
    const r = decideTankCollision(baseInput({
      selfSide: Side.Enemy,
      otherSide: Side.Player,
      selfCurrentBox: box(10, 0, 74, 64),
      selfPrevBox: box(0, 0, 64, 64),
      selfDirection: { x: 1, y: 0 },
      selfPlayerCollisionState: PlayerCollisionState.Colliding,
    }));
    assert.deepEqual(r, { kind: 'skip' });
  });

  it('both moving + other rolled back: align to other CURRENT (no mark)', () => {
    const r = decideTankCollision(baseInput({
      selfCurrentBox: box(10, 0, 74, 64),
      selfPrevBox: box(0, 0, 64, 64),
      otherCurrentBox: box(80, 0, 144, 64),
      otherPrevBox: box(100, 0, 164, 64),
      otherTankResolution: TankResolution.Both,
    }));
    assert.deepEqual(r, { kind: 'resolve-against-other-current' });
  });

  it('both moving toward each other (head-on equal dots) → rollback', () => {
    const r = decideTankCollision(baseInput({
      selfCurrentBox: box(40, 0, 104, 64),
      selfPrevBox: box(30, 0, 94, 64),
      selfDirection: { x: 1, y: 0 },
      otherCurrentBox: box(100, 0, 164, 64),
      otherPrevBox: box(110, 0, 174, 64),
      otherDirection: { x: -1, y: 0 },
    }));
    assert.equal(r.kind, 'rollback');
  });

  it('hasWallCollision: forces other to be initiator → skip (other handles)', () => {
    const r = decideTankCollision(baseInput({
      selfCurrentBox: box(40, 0, 104, 64),
      selfPrevBox: box(30, 0, 94, 64),
      selfDirection: { x: 1, y: 0 },
      otherCurrentBox: box(100, 0, 164, 64),
      otherPrevBox: box(110, 0, 174, 64),
      otherDirection: { x: -1, y: 0 },
      hasWallCollision: true,
    }));
    assert.deepEqual(r, { kind: 'skip' });
  });

  it('contact-count tiebreaker: other has external contacts, self has none → resolve', () => {
    const r = decideTankCollision(baseInput({
      // Both moving but in same direction (no initiator from dot products).
      selfCurrentBox: box(10, 0, 74, 64),
      selfPrevBox: box(0, 0, 64, 64),
      selfDirection: { x: 1, y: 0 },
      otherCurrentBox: box(110, 0, 174, 64),
      otherPrevBox: box(100, 0, 164, 64),
      otherDirection: { x: 1, y: 0 },   // also moving right — no head-on
      selfContactsExceptOther: 0,
      otherContactsExceptSelf: 2,
    }));
    // Per the legacy fallback: other has more contacts → we resolve.
    assert.deepEqual(r, { kind: 'resolve-against-other-prev' });
  });

  it('purity: same input yields same result on repeated calls', () => {
    const input = baseInput({
      selfCurrentBox: box(40, 0, 104, 64),
      selfPrevBox: box(30, 0, 94, 64),
      selfDirection: { x: 1, y: 0 },
      otherCurrentBox: box(100, 0, 164, 64),
      otherPrevBox: box(110, 0, 174, 64),
      otherDirection: { x: -1, y: 0 },
    });
    const a = decideTankCollision(input);
    const b = decideTankCollision(input);
    assert.deepEqual(a, b);
  });
});
