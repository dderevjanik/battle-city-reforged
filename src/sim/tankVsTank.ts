/**
 * Phase 2.4 — Pure tank-vs-tank collision rules.
 *
 * This is the most parity-sensitive code in the codebase: small changes
 * here affect "tank feel" in subtle, hard-to-diagnose ways. The legacy
 * collideTanks (Tank.ts lines 553-821 before this migration) was 270 lines
 * of nested conditionals. Extracted here as:
 *
 *   1. PlayerCollisionState FSM — the small state machine that gates the
 *      "enemy slips past stationary player on grid" abuse-prevention.
 *   2. tankAbuseDetection — pure geometry deciding if the enemy is
 *      moving-on-grid into a too-small intersection with player.
 *   3. decideTankCollision — the big initiator-or-not decision tree.
 *
 * Cross-tank reads (other.tankCollisionResolution, other.playerCollisionState,
 * other.collider.getDirection, etc.) are passed in as plain data so this
 * module never touches live GameObjects. That's also exactly the wire
 * shape the network code will need.
 */

import { Side } from './GameState';
import { Box } from './wallHit';

// ---- Player collision FSM (the "abuse prevention" machine) ---------------

export enum PlayerCollisionState {
  NotColliding = 0,
  Colliding = 1,
  WaitCollide = 2,
}

/**
 * Called from Tank.update (BEFORE collide() runs each frame). Advances the
 * FSM based on whether collide ran last frame:
 *
 *   WaitCollide → NotColliding  (collide was not invoked = no overlap)
 *   Colliding   → WaitCollide   (we were overlapping, now wait for collide)
 *
 * Matches Tank.ts:162-171 verbatim.
 */
export function tickPlayerFsmFromUpdate(
  s: PlayerCollisionState,
): PlayerCollisionState {
  if (s === PlayerCollisionState.WaitCollide) return PlayerCollisionState.NotColliding;
  if (s === PlayerCollisionState.Colliding) return PlayerCollisionState.WaitCollide;
  return s;
}

/**
 * Called during Tank.collide. If currently WaitCollide, update based on
 * whether any player-tank contacts are present this frame. Matches the
 * legacy block at Tank.ts:576-582.
 */
export function updatePlayerFsmDuringCollide(
  s: PlayerCollisionState,
  hasPlayerTankContact: boolean,
): PlayerCollisionState {
  if (s !== PlayerCollisionState.WaitCollide) return s;
  return hasPlayerTankContact
    ? PlayerCollisionState.Colliding
    : PlayerCollisionState.NotColliding;
}

// ---- Player-collision abuse detection ------------------------------------

/**
 * Decide whether an enemy tank should "slip past" a stationary player tank
 * to prevent the player from camping a chokepoint. Returns true ONLY when:
 *
 *   - enemy is the moving tank (caller filtered for this)
 *   - other is a player tank
 *   - we are not already in the Colliding state (i.e. fresh contact)
 *   - enemy is on a grid axis (rounded position aligned to TILE_SIZE_MEDIUM)
 *   - the intersection on the cross-axis is smaller than the bullet width,
 *     i.e. the player isn't fully in the bullet's path
 *
 * When true, the adapter suppresses collision resolution and flips
 * PlayerCollisionState to Colliding so subsequent ticks know to ignore
 * the overlap.
 */
export interface AbuseDetectionInput {
  selfDirection: { x: number; y: number };
  selfPosX: number;
  selfPosY: number;
  selfCurrentBox: Box;
  otherCurrentBox: Box;
  /** Width/height in pixels of the tank (typically 64). */
  selfTankWidth: number;
  selfTankHeight: number;
  /** Width of a bullet — defines the "actually in path" threshold. */
  bulletWidth: number;
  /** Grid cell size — typically TILE_SIZE_MEDIUM (32). */
  tileSize: number;
}

function intersectionWH(a: Box, b: Box): { w: number; h: number } {
  const w = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  const h = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
  return { w: Math.max(0, w), h: Math.max(0, h) };
}

export function shouldEnemyAbusePass(input: AbuseDetectionInput): boolean {
  const roundedX = Math.round(input.selfPosX);
  const roundedY = Math.round(input.selfPosY);

  const isHorizontal = input.selfDirection.x === 1 || input.selfDirection.x === -1;
  const isVertical = input.selfDirection.y === 1 || input.selfDirection.y === -1;

  const onGridHorizontally = isHorizontal && roundedY % input.tileSize === 0;
  const onGridVertically = isVertical && roundedX % input.tileSize === 0;

  const { w, h } = intersectionWH(input.selfCurrentBox, input.otherCurrentBox);

  const thresholdW = (input.selfTankWidth - input.bulletWidth) / 2;
  const thresholdH = (input.selfTankHeight - input.bulletWidth) / 2;

  // Note `<=` not `<` — matches the legacy strict `<=` comparison.
  if (onGridVertically && w <= thresholdW) return true;
  if (onGridHorizontally && h <= thresholdH) return true;
  return false;
}

// ---- The big initiator decision -----------------------------------------

export enum TankResolution {
  Unknown = 0,
  Self = 1,
  Both = 2,
}

export interface TankCollisionInput {
  selfSide: Side;
  otherSide: Side;

  selfCurrentBox: Box;
  selfPrevBox: Box;
  otherCurrentBox: Box;
  otherPrevBox: Box;

  /** Unit-ish direction from the swept collider (legacy `.normalize()` result). */
  selfDirection: { x: number; y: number };
  otherDirection: { x: number; y: number };

  selfPosX: number;
  selfPosY: number;
  selfTankWidth: number;
  selfTankHeight: number;
  bulletWidth: number;
  tileSize: number;

  /** Snapshot of `other.tankCollisionResolution` from this tick. */
  otherTankResolution: TankResolution;
  /** Snapshots of both tanks' PlayerCollisionState this tick. */
  selfPlayerCollisionState: PlayerCollisionState;
  otherPlayerCollisionState: PlayerCollisionState;

  /** Self has a separate non-tank wall contact this frame. */
  hasWallCollision: boolean;

  /** Contact-count tiebreaker inputs. */
  selfContactsExceptOther: number;
  otherContactsExceptSelf: number;
}

/**
 * What the adapter should do this tick.
 */
export type TankCollisionAction =
  | { kind: 'skip' }
  // Apply resolveMinkowski against the named box on the other tank. Adapter
  // also sets self.tankCollisionResolution = Self.
  | { kind: 'resolve-against-other-prev' }
  | { kind: 'resolve-against-other-current' }
  // resolveByRollback(selfDirection). Adapter sets self = Both.
  | { kind: 'rollback' }
  // Suppress this tick; flip PlayerCollisionState to Colliding (abuse path).
  | { kind: 'set-player-colliding' };

function isMoving(prev: Box, current: Box): boolean {
  return (
    prev.min.x !== current.min.x ||
    prev.min.y !== current.min.y ||
    prev.max.x !== current.max.x ||
    prev.max.y !== current.max.y
  );
}

function dot(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return a.x * b.x + a.y * b.y;
}

function boxCenter(b: Box): { x: number; y: number } {
  return { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
}

function normalizeDelta(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function decideTankCollision(
  input: TankCollisionInput,
): TankCollisionAction {
  // 1. If other tank has already resolved its half, we are done.
  if (input.otherTankResolution === TankResolution.Self) {
    return { kind: 'skip' };
  }

  const selfMoving = isMoving(input.selfPrevBox, input.selfCurrentBox);
  const otherMoving = isMoving(input.otherPrevBox, input.otherCurrentBox);

  // 2. Neither moving: nothing to do this tick.
  if (!selfMoving && !otherMoving) return { kind: 'skip' };

  // 3. Other is moving, self is not. Let other handle it.
  if (otherMoving && !selfMoving) return { kind: 'skip' };

  // 4. Self is moving, other is not.
  if (selfMoving && !otherMoving) {
    // Enemy moving into a stationary player tank — abuse-prevention check.
    if (input.selfSide === Side.Enemy && input.otherSide === Side.Player) {
      if (input.selfPlayerCollisionState === PlayerCollisionState.Colliding) {
        // Already passing through this player.
        return { kind: 'skip' };
      }
      if (
        shouldEnemyAbusePass({
          selfDirection: input.selfDirection,
          selfPosX: input.selfPosX,
          selfPosY: input.selfPosY,
          selfCurrentBox: input.selfCurrentBox,
          otherCurrentBox: input.otherCurrentBox,
          selfTankWidth: input.selfTankWidth,
          selfTankHeight: input.selfTankHeight,
          bulletWidth: input.bulletWidth,
          tileSize: input.tileSize,
        })
      ) {
        return { kind: 'set-player-colliding' };
      }
    }
    return { kind: 'resolve-against-other-prev' };
  }

  // 5. Both moving.

  // Player vs enemy where enemy is in an abuse-pass state — let the player
  // through.
  if (input.selfSide === Side.Player && input.otherSide === Side.Enemy) {
    if (
      input.otherPlayerCollisionState === PlayerCollisionState.Colliding ||
      input.otherPlayerCollisionState === PlayerCollisionState.WaitCollide
    ) {
      return { kind: 'skip' };
    }
  }
  if (input.selfSide === Side.Enemy && input.otherSide === Side.Player) {
    if (
      input.selfPlayerCollisionState === PlayerCollisionState.Colliding ||
      input.otherPlayerCollisionState === PlayerCollisionState.WaitCollide
    ) {
      return { kind: 'skip' };
    }
  }

  // Other already rolled back; align to its CURRENT box (after rollback).
  if (input.otherTankResolution === TankResolution.Both) {
    return { kind: 'resolve-against-other-current' };
  }

  // Dot-product-based initiator decision.
  const selfCenter = boxCenter(input.selfCurrentBox);
  const otherCenter = boxCenter(input.otherCurrentBox);
  const selfCollisionDir = normalizeDelta(selfCenter, otherCenter);
  const otherCollisionDir = normalizeDelta(otherCenter, selfCenter);

  const selfDot = dot(input.selfDirection, selfCollisionDir);
  const otherDot = dot(input.otherDirection, otherCollisionDir);

  let isSelfInitiator = selfDot > 0;
  let isOtherInitiator = otherDot > 0;

  // Tiebreaker when both initiating: equal dots → both, otherwise larger
  // dot wins.
  if (selfDot > 0 && otherDot > 0) {
    if (selfDot === otherDot) {
      isSelfInitiator = true;
      isOtherInitiator = true;
    } else {
      isSelfInitiator = selfDot > otherDot;
      isOtherInitiator = otherDot > selfDot;
    }
  }

  // Wall-collision override: if self has another non-tank obstacle, force
  // the other tank to be the resolver.
  if (input.hasWallCollision) {
    isSelfInitiator = false;
    isOtherInitiator = true;
  }

  if (isSelfInitiator && !isOtherInitiator) {
    return { kind: 'resolve-against-other-prev' };
  }
  if (!isSelfInitiator && isOtherInitiator) {
    // Let other handle it.
    return { kind: 'skip' };
  }
  if (isSelfInitiator && isOtherInitiator) {
    return { kind: 'rollback' };
  }

  // Neither is an initiator: contact-count tiebreaker. Whoever has the
  // fewer other contacts yields.
  if (
    input.otherContactsExceptSelf > 0 &&
    input.selfContactsExceptOther === 0
  ) {
    return { kind: 'resolve-against-other-prev' };
  }

  // Anything else — let it ride (matches the legacy "during testing this
  // seemed to work fine" fallback).
  return { kind: 'skip' };
}
