import { GameObject } from './GameObject';
import { Random, getGameRandom } from './Random';

/**
 * Determinism test harness — Phase 1.
 *
 * The goal is to be able to assert that two runs of the same level with the
 * same seed produce identical simulation state after N ticks. Until Phase 2
 * extracts a serializable GameState struct, "state" lives on the GameObject
 * tree, so we hash the gameplay-relevant fields of every node.
 *
 * Hash design: FNV-1a 32-bit, fed integer-coerced fields. We deliberately
 * coerce floats via Math.round(value * 1024) so tiny floating-point drift
 * below subpixel granularity does not register as a divergence. Two peers
 * whose positions drift by less than ~0.001 px would still report a matching
 * hash; that level of agreement is good enough for lockstep render lerp.
 *
 * Usage:
 *   const h = hashSimState(rootGameObject);
 *   console.log(`tick=${tick} hash=${h.toString(16)} rng=${rngState.toString(16)}`);
 *
 * Run the same level twice (same seed, same inputs) and the per-tick hash
 * sequence MUST match. Any divergence is a determinism bug.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function mix(h: number, value: number): number {
  h ^= value | 0;
  // Math.imul keeps the multiplication 32-bit; plain * would lose precision.
  return Math.imul(h, FNV_PRIME) >>> 0;
}

function mixFloat(h: number, value: number): number {
  // 1/1024 subpixel resolution is finer than any visible game effect but
  // coarser than likely IEEE-754 jitter across engines.
  return mix(h, Math.round(value * 1024));
}

export function hashSimState(root: GameObject): number {
  let h = FNV_OFFSET;

  root.traverseDescedants((node) => {
    if (node.isRemoved) return;
    h = mix(h, node.entityId);
    h = mixFloat(h, node.position.x);
    h = mixFloat(h, node.position.y);
    h = mixFloat(h, node.rotation);
    h = mixFloat(h, node.size.width);
    h = mixFloat(h, node.size.height);
  });

  // Fold in the RNG state so divergences in random-consuming code surface
  // immediately, not several frames later when the RNG diverges further.
  h = mix(h, getGameRandom().getState());

  return h >>> 0;
}

/**
 * Per-tick logger. Set window.__SIM_TRACE = true in the browser console to
 * enable. Logs the first `maxTicks` tick hashes — copy two runs' output and
 * `diff` them.
 */
export function maybeTraceTick(tick: number, root: GameObject, maxTicks = 600): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = globalThis as any;
  if (!w.__SIM_TRACE) return;
  if (tick > maxTicks) return;
  const h = hashSimState(root);
  // Tag with tick number so divergence point is obvious in the diff.
  // eslint-disable-next-line no-console
  console.log(`[sim] t=${tick} h=${h.toString(16).padStart(8, '0')}`);
}

// Re-export so callers can snapshot/restore RNG state from the harness without
// importing two modules.
export { Random };
