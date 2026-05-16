/**
 * Phase 2.3 — Snapshot recorder.
 *
 * Walks the live GameObject tree and produces a plain `GameState` struct.
 * This is intentionally a *read-only* projection: the live tree remains the
 * source of truth in Phases 2.1–2.3. The snapshot exists so we can:
 *
 *   1. diff two snapshots produced by two peers and see EXACTLY which entity
 *      diverged (the hash harness tells you *that* you diverged; this tells
 *      you *what*).
 *   2. serialize ticks to disk for replay testing.
 *   3. validate the GameState type definitions against real gameplay before
 *      committing to them as the wire format.
 *
 * Phase 2.4 will invert this relationship: simulate() will produce GameState,
 * and a "view" function will write that state back into Phaser sprites. At
 * that point this snapshot recorder becomes dead code (or, more usefully, a
 * round-trip equivalence test for the rewrite).
 */

import { GameObject } from '../core/GameObject';
import { Bullet } from '../gameObjects/Bullet';
import { Powerup } from '../gameObjects/Powerup';
import { Base } from '../gameObjects/Base';
import { Tank } from '../gameObjects/Tank';
import { EnemyTank } from '../gameObjects/EnemyTank';
import { TerrainTile } from '../gameObjects/TerrainTile';
import { Explosion } from '../gameObjects/Explosion';
import { SmallExplosion } from '../gameObjects/SmallExplosion';
import { Spawn } from '../gameObjects/Spawn';
import { getGameRandom } from '../core/Random';

import {
  BulletState,
  Dir,
  ExplosionState,
  GameState,
  PowerupState,
  Side,
  SpawnState,
  TankState,
  TerrainTileState,
  emptyGameState,
} from './GameState';

// Battle City rotations are stored in the game as degrees (Rotation enum). We
// translate to the compact Dir enum here. The mapping is fixed by config; if
// it ever changes, this is the one place to update.
function rotationToDir(deg: number): Dir {
  // Normalize to [0, 360)
  const n = ((Math.round(deg) % 360) + 360) % 360;
  switch (n) {
    case 0:
      return Dir.Up;
    case 90:
      return Dir.Right;
    case 180:
      return Dir.Down;
    case 270:
      return Dir.Left;
    default:
      // Tank rotation is supposed to be axis-aligned. If we ever see an
      // off-axis value, that's itself a determinism bug worth surfacing.
      // Fall through to nearest cardinal so the snapshot doesn't crash.
      return ((n / 90) | 0) as Dir;
  }
}

function ticksLeft(timer: { getTicksLeft?: () => number | null } | undefined): number {
  if (!timer || typeof timer.getTicksLeft !== 'function') return 0;
  return timer.getTicksLeft() ?? 0;
}

function snapTank(node: Tank): TankState {
  // Tank stores most of its mutable state via tagged subsystems (weapon,
  // shield, timers). We read through public fields where available and fall
  // back to `any` for protected timers — Phase 2.4 will replace these reads
  // with direct GameState lookups so the cast disappears.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = node as any;
  return {
    id: node.entityId,
    side: node instanceof EnemyTank ? Side.Enemy : Side.Player,
    partyIndex: node.partyIndex,
    x: node.position.x,
    y: node.position.y,
    rotation: rotationToDir(node.rotation),
    health: node.attributes?.health ?? 0,
    type: node.type ? String(node.type) : node.constructor.name,
    moving: t.state === 'Moving' || t.state?.toString?.() === 'Moving',
    hasShield: node.shield !== null && node.shield !== undefined,
    shieldTicksLeft: ticksLeft(t.shieldTimer),
    isOnIce: !!node.isOnIce,
    slideTicksLeft: ticksLeft(t.slideTimer),
    stunTicksLeft: ticksLeft(t.stunTimer),
  };
}

function snapBullet(node: Bullet): BulletState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = (node as any).tags ?? [];
  const isEnemy = tags.includes('Enemy') || tags.some((t: unknown) => String(t).includes('Enemy'));
  return {
    id: node.entityId,
    ownerTankId: -1, // Phase 2.4: actually track owner tank id; today only partyIndex is kept
    side: isEnemy ? Side.Enemy : Side.Player,
    x: node.position.x,
    y: node.position.y,
    rotation: rotationToDir(node.rotation),
    speed: node.speed,
    tankDamage: node.tankDamage,
    wallDamage: node.wallDamage,
  };
}

function snapPowerup(node: Powerup): PowerupState {
  return {
    id: node.entityId,
    type: String(node.type),
    x: node.position.x,
    y: node.position.y,
    ticksLeft: 0, // Phase 2.4: surface the powerup's despawn timer if any
  };
}

function snapTerrain(node: TerrainTile): TerrainTileState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = node as any;
  return {
    id: node.entityId,
    kind: String(t.type ?? t.terrainType ?? 'unknown'),
    x: node.position.x,
    y: node.position.y,
    w: node.size.width,
    h: node.size.height,
    fragmentMask: t.fragmentMask,
  };
}

function snapExplosion(node: Explosion | SmallExplosion, kind: 'small' | 'large'): ExplosionState {
  return {
    id: node.entityId,
    kind,
    x: node.position.x,
    y: node.position.y,
    ticksLeft: 0, // Phase 2.4: read from the animation timer
  };
}

function snapSpawn(node: Spawn): SpawnState {
  return {
    id: node.entityId,
    x: node.position.x,
    y: node.position.y,
    ticksLeft: 0,
    willSpawnTankId: -1,
  };
}

function snapBase(node: Base) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = node as any;
  return {
    x: node.position.x,
    y: node.position.y,
    alive: !node.isRemoved,
    defenceTicksLeft: ticksLeft(t.defenceTimer),
  };
}

/**
 * Snapshot the live tree into a plain GameState.
 *
 * `tick` is passed in because the tree itself does not know what sim tick it
 * is — the caller (GameScene fixed-step loop) does. Likewise `scores` /
 * `lives` are fed in because they live on session/state objects today, not
 * on the tree.
 */
export interface SnapshotInputs {
  tick: number;
  scores: number[];
  lives: number[];
  nextEntityId: number;
}

export function snapshot(root: GameObject, inputs: SnapshotInputs): GameState {
  const out: GameState = {
    ...emptyGameState(),
    tick: inputs.tick,
    rngState: getGameRandom().getState(),
    nextEntityId: inputs.nextEntityId,
    scores: inputs.scores.slice(),
    lives: inputs.lives.slice(),
  };

  root.traverseDescedants((node) => {
    if (node.isRemoved) return;

    if (node instanceof Bullet) {
      out.bullets.push(snapBullet(node));
    } else if (node instanceof Powerup) {
      out.powerups.push(snapPowerup(node));
    } else if (node instanceof Base) {
      out.base = snapBase(node);
    } else if (node instanceof TerrainTile) {
      out.terrain.push(snapTerrain(node));
    } else if (node instanceof Explosion) {
      out.explosions.push(snapExplosion(node, 'large'));
    } else if (node instanceof SmallExplosion) {
      out.explosions.push(snapExplosion(node, 'small'));
    } else if (node instanceof Spawn) {
      out.spawns.push(snapSpawn(node));
    } else if (node instanceof Tank) {
      // Tank check must come AFTER its subclasses (none currently, but be
      // defensive — EnemyTank/PlayerTank already extend Tank).
      out.tanks.push(snapTank(node));
    }
  });

  // Sort arrays by entityId so two snapshots of equivalent states diff cleanly
  // regardless of tree traversal order.
  const byId = <T extends { id: number }>(a: T, b: T) => a.id - b.id;
  out.tanks.sort(byId);
  out.bullets.sort(byId);
  out.powerups.sort(byId);
  out.explosions.sort(byId);
  out.spawns.sort(byId);
  out.terrain.sort(byId);

  return out;
}

/**
 * Human-readable diff of two snapshots. Returns the empty string when equal.
 * Designed to be pasted into the console next to another tab's output for
 * a quick visual comparison.
 */
export function diffSnapshots(a: GameState, b: GameState): string {
  const lines: string[] = [];

  if (a.tick !== b.tick) lines.push(`tick: ${a.tick} ≠ ${b.tick}`);
  if (a.rngState !== b.rngState)
    lines.push(`rngState: ${a.rngState.toString(16)} ≠ ${b.rngState.toString(16)}`);
  if (a.nextEntityId !== b.nextEntityId)
    lines.push(`nextEntityId: ${a.nextEntityId} ≠ ${b.nextEntityId}`);

  const compareList = <T extends { id: number }>(
    name: string,
    xs: T[],
    ys: T[],
  ) => {
    if (xs.length !== ys.length) {
      lines.push(`${name}: count ${xs.length} ≠ ${ys.length}`);
    }
    const max = Math.max(xs.length, ys.length);
    for (let i = 0; i < max; i++) {
      const x = xs[i];
      const y = ys[i];
      if (!x || !y) {
        lines.push(`${name}[${i}]: ${JSON.stringify(x)} ≠ ${JSON.stringify(y)}`);
        continue;
      }
      const sx = JSON.stringify(x);
      const sy = JSON.stringify(y);
      if (sx !== sy) lines.push(`${name}[id=${x.id}]:\n  a: ${sx}\n  b: ${sy}`);
    }
  };

  compareList('tanks', a.tanks, b.tanks);
  compareList('bullets', a.bullets, b.bullets);
  compareList('powerups', a.powerups, b.powerups);
  compareList('explosions', a.explosions, b.explosions);
  compareList('spawns', a.spawns, b.spawns);
  compareList('terrain', a.terrain, b.terrain);

  if (JSON.stringify(a.base) !== JSON.stringify(b.base)) {
    lines.push(`base:\n  a: ${JSON.stringify(a.base)}\n  b: ${JSON.stringify(b.base)}`);
  }

  return lines.join('\n');
}
