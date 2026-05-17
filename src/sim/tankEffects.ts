/**
 * Phase 2.4 — Pure tank status-effect state machines.
 *
 * Three small effects share a file because they all answer the same
 * question: "given an integer tick countdown, what does this entity want
 * the adapter to do this tick?"
 *
 *   slide  — player tank slides on ice for ICE_SLIDE_DURATION after
 *            releasing controls. The pure rule reports the per-tick action
 *            (keep moving / become idle), the adapter performs it.
 *   stun   — temporary movement lock from friendly fire. Tracks a separate
 *            blink-cosmetic countdown that the rule keeps in lockstep with
 *            the main stun.
 *   shield — invulnerability bubble. Trivial countdown; reports the
 *            "expired this tick" edge so the adapter can remove the shield
 *            GameObject.
 *
 * Each state is JSON-serializable for eventual TankState replication.
 */

const SIM_HZ = 60;

// =============================================================================
// Slide
// =============================================================================

export interface SlideState {
  /** Ticks remaining; 0 means inactive. */
  ticksLeft: number;
}

export function initSlide(): SlideState {
  return { ticksLeft: 0 };
}

export function startSlide(durationSec: number): SlideState {
  return { ticksLeft: Math.max(1, Math.round(durationSec * SIM_HZ)) };
}

export const isSliding = (s: SlideState): boolean => s.ticksLeft > 0;

/**
 * Per-tick slide decision the adapter dispatches:
 *   continue  — still on ice, move() this tick.
 *   end       — slide is done OR the tank just stepped off ice. Caller
 *               should idle(checkIce=false). One signal collapses the two
 *               cases because the legacy code reacted identically.
 *   inactive  — not sliding at all this tick; no side effect.
 */
export type SlideAction = 'continue' | 'end' | 'inactive';

export function tickSlide(
  stateIn: SlideState,
  isOnIce: boolean,
): { state: SlideState; action: SlideAction } {
  if (stateIn.ticksLeft <= 0) {
    return { state: stateIn, action: 'inactive' };
  }
  // Stepped off ice mid-slide: stop immediately.
  if (!isOnIce) {
    return { state: { ticksLeft: 0 }, action: 'end' };
  }
  const nextTicks = stateIn.ticksLeft - 1;
  if (nextTicks <= 0) {
    return { state: { ticksLeft: 0 }, action: 'end' };
  }
  return { state: { ticksLeft: nextTicks }, action: 'continue' };
}

// =============================================================================
// Stun
// =============================================================================

export interface StunState {
  stunTicksLeft: number;
  blinkTicksLeft: number;
  /** Sprite visibility — flips every blink interval while stunned. */
  visible: boolean;
}

export function initStun(): StunState {
  return { stunTicksLeft: 0, blinkTicksLeft: 0, visible: true };
}

export function startStun(
  stunDurationSec: number,
  blinkDelaySec: number,
): StunState {
  return {
    stunTicksLeft: Math.max(1, Math.round(stunDurationSec * SIM_HZ)),
    blinkTicksLeft: Math.max(1, Math.round(blinkDelaySec * SIM_HZ)),
    visible: false,
  };
}

export const isStunned = (s: StunState): boolean => s.stunTicksLeft > 0;

export interface StunDecision {
  state: StunState;
  /** True when `visible` flipped this tick — adapter writes the sprite. */
  visibilityChanged: boolean;
  /**
   * True on the tick stun expires. On this edge the adapter should force
   * the sprite visible (matches the legacy handleStunTimer callback).
   */
  stunEnded: boolean;
}

export function tickStun(stateIn: StunState, blinkDelaySec: number): StunDecision {
  if (stateIn.stunTicksLeft <= 0) {
    return { state: stateIn, visibilityChanged: false, stunEnded: false };
  }

  // "Tick first, fire on zero" — same convention as tickShield / tickSlide.
  // Cosmetic 1-tick deviation from the legacy "check then tick" pattern;
  // perceptually identical and keeps the module internally consistent.
  let blinkTicksLeft = stateIn.blinkTicksLeft - 1;
  let visible = stateIn.visible;
  let visibilityChanged = false;

  if (blinkTicksLeft <= 0) {
    blinkTicksLeft = Math.max(1, Math.round(blinkDelaySec * SIM_HZ));
    visible = !visible;
    visibilityChanged = true;
  }

  let stunTicksLeft = stateIn.stunTicksLeft - 1;
  const stunEnded = stunTicksLeft <= 0;
  if (stunEnded) {
    stunTicksLeft = 0;
    blinkTicksLeft = 0;
    if (!visible) {
      visible = true;
      visibilityChanged = true;
    }
  }

  return {
    state: { stunTicksLeft, blinkTicksLeft, visible },
    visibilityChanged,
    stunEnded,
  };
}

// =============================================================================
// Shield
// =============================================================================

export interface ShieldState {
  ticksLeft: number;
}

export function initShield(): ShieldState {
  return { ticksLeft: 0 };
}

export function startShield(durationSec: number): ShieldState {
  return { ticksLeft: Math.max(1, Math.round(durationSec * SIM_HZ)) };
}

export const hasShield = (s: ShieldState): boolean => s.ticksLeft > 0;

export interface ShieldDecision {
  state: ShieldState;
  /** True on the tick the shield expires — adapter removes the GameObject. */
  ended: boolean;
}

export function tickShield(stateIn: ShieldState): ShieldDecision {
  if (stateIn.ticksLeft <= 0) {
    return { state: stateIn, ended: false };
  }
  const next = stateIn.ticksLeft - 1;
  if (next <= 0) {
    return { state: { ticksLeft: 0 }, ended: true };
  }
  return { state: { ticksLeft: next }, ended: false };
}
