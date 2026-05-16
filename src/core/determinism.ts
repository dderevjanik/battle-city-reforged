import { GameObject } from './GameObject';
import { Random, getGameRandom } from './Random';

/**
 * Determinism test harness — Phase 1.
 *
 * Hashes are split by dimension so divergence reports tell us *what* diverged:
 *   rng    — PRNG state. Mismatch ⇒ random-consuming code (AI, powerups) is
 *            drawing different values, usually because of an upstream branch.
 *   pos    — entity positions / rotations. Mismatch with matching rng ⇒
 *            float-physics drift (rare with fixed timestep) or non-sim entity
 *            count drift.
 *   tree   — entity-id list shape. Mismatch ⇒ entities created or removed in
 *            different order between peers — most likely cause of "plays the
 *            same but hash differs".
 *
 * Hash space is FNV-1a 32-bit. Positions are coerced via Math.round(v * 1024)
 * so jitter below ~0.001 px is ignored.
 *
 * We restrict the walk to ENTITIES THAT MATTER FOR SIMULATION. Render-only
 * decoration (curtains, transition overlays, score text, debug overlays,
 * tweened UI elements) sits in the same tree but has nothing to do with the
 * game state two peers must agree on. To opt a node out of the hash, set
 * `node.excludeFromSimHash = true` on construction.
 *
 * Browser usage:
 *   window.__SIM_TRACE = true        // start per-tick logging
 *   window.__SIM_DUMP  = 120         // dump full entity list at tick 120
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function mix(h: number, value: number): number {
  h ^= value | 0;
  return Math.imul(h, FNV_PRIME) >>> 0;
}
function mixFloat(h: number, value: number): number {
  return mix(h, Math.round(value * 1024));
}

// Class-name allowlist. Anything outside this set is treated as render-only
// for hashing purposes. Maintained by hand because it doubles as the
// canonical list of "what's actually part of the simulation" — i.e. exactly
// what Phase 2's GameState struct will need to cover.
const SIM_CLASSES = new Set<string>([
  'PlayerTank',
  'EnemyTank',
  'Tank',
  'Bullet',
  'Powerup',
  'Bomb',
  'BombBlast',
  'Base',
  'BaseHeart',
  'Shield',
  'Spawn',
  'Explosion',
  'SmallExplosion',
  'TerrainTile',
  'TerrainTileDestroyer',
]);

function isSimEntity(node: GameObject): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((node as any).excludeFromSimHash) return false;
  return SIM_CLASSES.has(node.constructor.name);
}

export interface SimHash {
  /** Combined hash — what the per-tick trace prints. */
  combined: number;
  /** Hash of PRNG state alone. */
  rng: number;
  /** Hash of entity-id ordering (no positions). */
  tree: number;
  /** Hash of positions/rotations/sizes for sim entities. */
  pos: number;
  /** Number of sim entities counted. */
  count: number;
}

export function hashSimState(root: GameObject): SimHash {
  let tree = FNV_OFFSET;
  let pos = FNV_OFFSET;
  let count = 0;

  root.traverseDescedants((node) => {
    if (node.isRemoved) return;
    if (!isSimEntity(node)) return;
    count++;
    tree = mix(tree, node.entityId);
    pos = mix(pos, node.entityId);
    pos = mixFloat(pos, node.position.x);
    pos = mixFloat(pos, node.position.y);
    pos = mixFloat(pos, node.rotation);
  });

  const rng = mix(FNV_OFFSET, getGameRandom().getState());

  let combined = FNV_OFFSET;
  combined = mix(combined, tree);
  combined = mix(combined, pos);
  combined = mix(combined, rng);
  combined = mix(combined, count);

  return { combined: combined >>> 0, rng: rng >>> 0, tree: tree >>> 0, pos: pos >>> 0, count };
}

/** Dump every sim entity to console for a side-by-side diff. */
export function dumpSimEntities(tick: number, root: GameObject): void {
  const rows: string[] = [];
  root.traverseDescedants((node) => {
    if (node.isRemoved) return;
    if (!isSimEntity(node)) return;
    rows.push(
      [
        `id=${node.entityId}`,
        node.constructor.name.padEnd(20),
        `x=${node.position.x.toFixed(3)}`,
        `y=${node.position.y.toFixed(3)}`,
        `r=${node.rotation.toFixed(3)}`,
      ].join('  '),
    );
  });
  // eslint-disable-next-line no-console
  console.log(`[sim-dump t=${tick}]\n${rows.join('\n')}`);
}

export function maybeTraceTick(tick: number, root: GameObject, maxTicks = 600): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = globalThis as any;
  if (!w.__SIM_TRACE) return;

  if (tick <= maxTicks) {
    const h = hashSimState(root);
    // Format: tick, combined hash, then per-dimension hashes so a diff
    // immediately shows which axis diverged.
    // eslint-disable-next-line no-console
    console.log(
      `[sim] t=${String(tick).padStart(4, '0')} ` +
        `h=${h.combined.toString(16).padStart(8, '0')} ` +
        `tree=${h.tree.toString(16).padStart(8, '0')} ` +
        `pos=${h.pos.toString(16).padStart(8, '0')} ` +
        `rng=${h.rng.toString(16).padStart(8, '0')} ` +
        `n=${h.count}`,
    );
  }

  if (typeof w.__SIM_DUMP === 'number' && w.__SIM_DUMP === tick) {
    dumpSimEntities(tick, root);
  }
}

export { Random };
