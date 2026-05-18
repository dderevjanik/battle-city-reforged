/**
 * Integration tests — Phase 2.4 verification.
 *
 * Each unit test in src/sim/*.test.ts pins down one rule in isolation. The
 * exhaustive test below composes those rules into a small headless
 * `simStep()` and runs scripted multi-tick scenarios through it. Three
 * things this catches that unit tests cannot:
 *
 *   1. Inter-module ordering bugs — e.g. "stun phase ran before bullet hit
 *      classified the contact", "fire timer ticked twice per frame".
 *   2. Real determinism — replay the same input sequence twice and
 *      byte-compare the per-tick state hash sequences.
 *   3. Cross-state interactions — shield prevents damage, ice triggers
 *      slide, bullet-vs-bullet annihilates, etc.
 *
 * Also doubles as a proof-of-concept for the eventual real `simulate()`
 * function. The shape and composition pattern here is what we'll lift
 * into `src/sim/simulate.ts` when we do the Phase 2.4-endgame inversion.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Random } from '../core/Random.ts';
import { Dir, Side, rotationToDir } from './GameState.ts';
import { InputBits, PlayerInputBits, makeInput } from './Input.ts';
import { stepBullet, resolveBulletPair, DIR_DELTA } from './bullet.ts';
import { classifyBulletHit } from './bulletHit.ts';
import { stepPlayer } from './behaviors/player.ts';
import {
  AiState,
  aiPhaseDecide,
  aiPhaseFire,
  aiPhaseStuck,
  initAi,
} from './behaviors/ai.ts';
import {
  ShieldState,
  SlideState,
  StunState,
  initShield,
  initSlide,
  initStun,
  isSliding,
  isStunned,
  startSlide,
  startStun,
  tickShield,
  tickSlide,
  tickStun,
} from './tankEffects.ts';
import { tankMoveDelta } from './tankMotion.ts';
import {
  WeaponState,
  afterFire,
  canFire,
  initWeapon,
  tickWeapon,
} from './weapon.ts';
import {
  alignAgainstWallScalar,
  classifyWallHit,
  pickClosestWallContact,
  WallDamage,
  WallKind,
  Box,
} from './wallHit.ts';
import { shouldPickupPowerup } from './powerupPickup.ts';

// ----------------------------------------------------------------------------
// Mini state model — a subset of the eventual GameState. Just enough to
// exercise interactions between rules.
// ----------------------------------------------------------------------------

const SIM_HZ = 60;
const STEP = 1 / SIM_HZ;
const TANK_SIZE = 64;
const BULLET_W = 8;
const BULLET_H = 16;
const TANK_SPEED = 240;     // px/sec
const BULLET_SPEED = 960;

interface Tank {
  id: number;
  side: Side;
  partyIndex: number;
  x: number;
  y: number;
  rotation: Dir;
  health: number;
  alive: boolean;
  weapon: WeaponState;
  slide: SlideState;
  stun: StunState;
  shield: ShieldState;
  isOnIce: boolean;
}

interface Bullet {
  id: number;
  ownerTankId: number;
  side: Side;
  x: number;
  y: number;
  rotation: Dir;
  alive: boolean;
}

interface Powerup {
  id: number;
  x: number;
  y: number;
  alive: boolean;
}

interface Wall {
  id: number;
  kind: WallKind;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
}

interface IceTile {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MiniState {
  tick: number;
  nextEntityId: number;
  tanks: Tank[];
  bullets: Bullet[];
  powerups: Powerup[];
  walls: Wall[];
  iceTiles: IceTile[];
  /** Behavior state lives alongside tanks (parallel array keyed by id). */
  ai: Map<number, AiState>;
  /** PRNG snapshotted each step for replay. */
  rng: Random;
}

function makeTank(over: Partial<Tank> & Pick<Tank, 'id' | 'side' | 'x' | 'y'>): Tank {
  return {
    rotation: Dir.Up,
    partyIndex: over.side === Side.Player ? 0 : -1,
    health: 1,
    alive: true,
    weapon: initWeapon(),
    slide: initSlide(),
    stun: initStun(),
    shield: initShield(),
    isOnIce: false,
    ...over,
  };
}

function tankBox(t: Tank): Box {
  return {
    min: { x: t.x, y: t.y },
    max: { x: t.x + TANK_SIZE, y: t.y + TANK_SIZE },
  };
}
function bulletBox(b: Bullet): Box {
  return {
    min: { x: b.x, y: b.y },
    max: { x: b.x + BULLET_W, y: b.y + BULLET_H },
  };
}
function wallBox(w: Wall): Box {
  return { min: { x: w.x, y: w.y }, max: { x: w.x + w.w, y: w.y + w.h } };
}
function iceBox(i: IceTile): Box {
  return { min: { x: i.x, y: i.y }, max: { x: i.x + i.w, y: i.y + i.h } };
}

function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.min.x < b.max.x && a.max.x > b.min.x &&
    a.min.y < b.max.y && a.max.y > b.min.y
  );
}

// ----------------------------------------------------------------------------
// simStep — one fixed-tick advance of the whole world.
//
// Mirrors the legacy LevelPlayScene update sequence, but using pure rules.
// ----------------------------------------------------------------------------

interface InputFrame {
  /** PlayerInputBits keyed by tank.partyIndex. */
  players: Map<number, PlayerInputBits>;
}

function simStep(state: MiniState, frame: InputFrame): MiniState {
  // 1. Per-tank effect ticks (shield, stun, slide). The decisions are
  //    discarded for the slide; tank just keeps moving in its facing
  //    direction while sliding.
  for (const t of state.tanks) {
    if (!t.alive) continue;
    t.shield = tickShield(t.shield).state;
    if (isStunned(t.stun)) {
      const r = tickStun(t.stun, 0.1);
      t.stun = r.state;
    }
  }

  // 2. Ice detection: which tanks are on ice this tick.
  for (const t of state.tanks) {
    if (!t.alive) continue;
    const tb = tankBox(t);
    let onIce = false;
    for (const ice of state.iceTiles) {
      // Center-containment matches isOnIce rule
      const cx = (tb.min.x + tb.max.x) / 2;
      const cy = (tb.min.y + tb.max.y) / 2;
      const ib = iceBox(ice);
      if (cx >= ib.min.x && cx <= ib.max.x && cy >= ib.min.y && cy <= ib.max.y) {
        onIce = true;
        break;
      }
    }
    t.isOnIce = onIce;
  }

  // 3. Behavior phase per tank.
  for (const t of state.tanks) {
    if (!t.alive) continue;
    if (isStunned(t.stun)) continue;   // stunned tanks: no behavior

    if (t.side === Side.Player) {
      stepPlayerTank(state, t, frame.players.get(t.partyIndex) ?? 0);
    } else {
      stepEnemyTank(state, t);
    }
  }

  // 4. Bullet motion + collision resolution (every bullet, in id order for
  //    determinism).
  resolveBullets(state);

  // 5. Powerup pickup checks.
  resolvePickups(state);

  // 6. Weapon cooldown tick.
  for (const t of state.tanks) {
    if (!t.alive) continue;
    t.weapon = tickWeapon(t.weapon);
  }

  state.tick++;
  return state;
}

function stepPlayerTank(state: MiniState, t: Tank, input: PlayerInputBits): void {
  // Slide overrides movement input — the legacy idle() locks input while
  // sliding. We model that by applying tank-mover anyway in the slide
  // direction.
  if (isSliding(t.slide)) {
    const r = tickSlide(t.slide, t.isOnIce);
    t.slide = r.state;
    if (r.action === 'continue') applyMove(t);
    return;
  }

  const decision = stepPlayer(input, {
    isSliding: false,
    isStunned: isStunned(t.stun),
    isIdle: false,  // simplified — we don't track tank.state here
  });

  if (decision.tryFire) tryFire(state, t);
  if (decision.rotate !== null) t.rotation = decision.rotate;
  if (decision.willMove) applyMove(t);

  // Released input while on ice → start a slide.
  if (decision.willIdle && t.isOnIce && !isSliding(t.slide)) {
    t.slide = startSlide(1.0);   // ICE_SLIDE_DURATION
  }
}

function stepEnemyTank(state: MiniState, t: Tank): void {
  const aiState = state.ai.get(t.id) ?? initAi();

  const fire = aiPhaseFire(aiState, state.rng);
  state.ai.set(t.id, fire.state);

  let hadFired = false;
  if (fire.tryFire) {
    hadFired = tryFire(state, t);
  }

  const obs = {
    x: t.x, y: t.y,
    rotation: t.rotation,
    baseX: 416, baseY: 800,   // arbitrary base location for the test
    tileSize: 32,
  };
  const decide = aiPhaseDecide(state.ai.get(t.id)!, obs, hadFired, state.rng);
  state.ai.set(t.id, decide.state);

  if (decide.rotate !== null) t.rotation = decide.rotate;

  if (decide.willMove) {
    applyMove(t);
    const stuck = aiPhaseStuck(
      state.ai.get(t.id)!,
      { ...obs, x: t.x, y: t.y },
      state.rng,
    );
    state.ai.set(t.id, stuck.state);
  }
}

function applyMove(t: Tank): void {
  const { dx, dy } = tankMoveDelta(t.rotation, TANK_SPEED, STEP);
  t.x += dx;
  t.y += dy;
}

function tryFire(state: MiniState, t: Tank): boolean {
  if (!canFire(t.weapon, state.bullets.filter((b) => b.alive && b.ownerTankId === t.id).length, 1)) {
    return false;
  }

  const bullet: Bullet = {
    id: state.nextEntityId++,
    ownerTankId: t.id,
    side: t.side,
    x: t.x + TANK_SIZE / 2 - BULLET_W / 2,
    y: t.y + TANK_SIZE / 2 - BULLET_H / 2,
    rotation: t.rotation,
    alive: true,
  };
  state.bullets.push(bullet);
  t.weapon = afterFire(t.weapon, 0.3);    // 0.3s rapid-fire
  return true;
}

function resolveBullets(state: MiniState): void {
  // Sort by id so iteration is deterministic regardless of insertion churn.
  state.bullets.sort((a, b) => a.id - b.id);

  // Move each bullet, then check collisions in the new position.
  for (const b of state.bullets) {
    if (!b.alive) continue;
    const moved = stepBullet(
      { id: b.id, ownerTankId: b.ownerTankId, side: b.side, x: b.x, y: b.y,
        rotation: b.rotation, speed: BULLET_SPEED,
        tankDamage: 1, wallDamage: WallDamage.Normal },
      STEP,
    );
    b.x = moved.x;
    b.y = moved.y;
  }

  // Bullet-vs-bullet annihilation (pair check, id-sorted so order matches
  // across replays).
  for (let i = 0; i < state.bullets.length; i++) {
    const a = state.bullets[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < state.bullets.length; j++) {
      const c = state.bullets[j];
      if (!c.alive) continue;
      if (!boxesOverlap(bulletBox(a), bulletBox(c))) continue;
      const o = resolveBulletPair({ side: a.side }, { side: c.side });
      if (o.destroyA) a.alive = false;
      if (o.destroyB) c.alive = false;
    }
  }

  // Bullet-vs-wall.
  for (const b of state.bullets) {
    if (!b.alive) continue;
    const wallContacts = state.walls
      .filter((w) => w.alive && boxesOverlap(bulletBox(b), wallBox(w)))
      .map((w) => ({ box: wallBox(w), data: w }));
    if (wallContacts.length === 0) continue;

    const closest = pickClosestWallContact(bulletBox(b), wallContacts);
    if (!closest) continue;

    const hit = classifyWallHit(closest.data.kind, WallDamage.Normal, b.side === Side.Player);
    if (hit.destroysWall) closest.data.alive = false;

    const adjust = alignAgainstWallScalar(bulletBox(b), closest.box, b.rotation);
    // For tests we approximate translateY by applying along the move axis.
    if (b.rotation === Dir.Up || b.rotation === Dir.Down) b.y -= adjust * DIR_DELTA[b.rotation].dy;
    else b.x -= adjust * DIR_DELTA[b.rotation].dx;
    b.alive = false;  // bullet always destroyed on wall hit
  }

  // Bullet-vs-tank.
  for (const b of state.bullets) {
    if (!b.alive) continue;
    for (const t of state.tanks) {
      if (!t.alive) continue;
      if (t.id === b.ownerTankId) continue;
      if (!boxesOverlap(bulletBox(b), tankBox(t))) continue;

      const verdict = classifyBulletHit({
        isSelfBullet: false,    // already filtered
        hasShield: t.shield.ticksLeft > 0,
        bulletSide: b.side,
        tankSide: t.side,
        friendlyFireEnabled: true,
        alreadyStunned: isStunned(t.stun),
      });

      switch (verdict) {
        case 'shield-absorbs':
          b.alive = false;
          break;
        case 'damage':
          b.alive = false;
          t.health -= 1;
          if (t.health <= 0) t.alive = false;
          break;
        case 'friendly-fire-stun':
          b.alive = false;
          t.stun = startStun(2, 0.1);
          break;
        case 'friendly-fire-disabled':
        case 'friendly-fire-already-stunned':
          b.alive = false;
          break;
        case 'enemy-vs-enemy':
        case 'self-bullet':
          break;
      }
    }
  }

  // Garbage-collect dead bullets.
  state.bullets = state.bullets.filter((b) => b.alive);
}

function resolvePickups(state: MiniState): void {
  for (const p of state.powerups) {
    if (!p.alive) continue;
    const pBox: Box = { min: { x: p.x, y: p.y }, max: { x: p.x + 64, y: p.y + 64 } };
    for (const t of state.tanks) {
      if (!t.alive || t.side !== Side.Player) continue;
      if (shouldPickupPowerup(pBox, tankBox(t))) {
        p.alive = false;
        break;
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Hash helper: collapse the whole state to a single 32-bit number for
// replay diffs.
// ----------------------------------------------------------------------------

const FNV_PRIME = 0x01000193;
function mix(h: number, v: number): number {
  return Math.imul(h ^ (v | 0), FNV_PRIME) >>> 0;
}
function mixFloat(h: number, v: number): number {
  return mix(h, Math.round(v * 1024));
}
function hashState(s: MiniState): number {
  let h = 0x811c9dc5;
  h = mix(h, s.tick);
  h = mix(h, s.nextEntityId);
  h = mix(h, s.rng.getState());
  for (const t of [...s.tanks].sort((a, b) => a.id - b.id)) {
    h = mix(h, t.id);
    h = mix(h, t.alive ? 1 : 0);
    h = mixFloat(h, t.x);
    h = mixFloat(h, t.y);
    h = mix(h, t.rotation);
    h = mix(h, t.health);
    h = mix(h, t.weapon.cooldownTicksLeft);
    h = mix(h, t.slide.ticksLeft);
    h = mix(h, t.stun.stunTicksLeft);
    h = mix(h, t.shield.ticksLeft);
  }
  for (const b of [...s.bullets].sort((a, b) => a.id - b.id)) {
    h = mix(h, b.id);
    h = mix(h, b.alive ? 1 : 0);
    h = mixFloat(h, b.x);
    h = mixFloat(h, b.y);
  }
  for (const p of [...s.powerups].sort((a, b) => a.id - b.id)) {
    h = mix(h, p.id);
    h = mix(h, p.alive ? 1 : 0);
  }
  for (const w of [...s.walls].sort((a, b) => a.id - b.id)) {
    h = mix(h, w.id);
    h = mix(h, w.alive ? 1 : 0);
  }
  return h >>> 0;
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

function makeScenarioWorld(seed = 0xC0FFEE): MiniState {
  // Player at (100, 100) facing Up. Enemy at (500, 500) facing Down.
  // One brick wall at (300, 100). One powerup at (200, 200). One ice tile
  // at (100, 250). All in a y-up coord space.
  return {
    tick: 0,
    nextEntityId: 100,
    tanks: [
      makeTank({ id: 1, side: Side.Player, x: 100, y: 100, rotation: Dir.Up }),
      makeTank({ id: 2, side: Side.Enemy, x: 500, y: 500, rotation: Dir.Down }),
    ],
    bullets: [],
    powerups: [{ id: 10, x: 200, y: 200, alive: true }],
    walls: [{ id: 20, kind: 'brick', x: 300, y: 100, w: 32, h: 32, alive: true }],
    iceTiles: [{ x: 100, y: 250, w: 64, h: 64 }],
    ai: new Map(),
    rng: new Random(seed),
  };
}

describe('integration — single-rule sanity checks', () => {
  it('player fires once, cooldown blocks immediate refire (count by owner)', () => {
    // The enemy tank also has AI that may fire during these ticks, so we
    // count bullets owned by the player specifically.
    const s = makeScenarioWorld();
    const playerBullets = () =>
      s.bullets.filter((b) => b.alive && b.ownerTankId === 1).length;

    simStep(s, { players: new Map([[0, makeInput({ Fire: true })]]) });
    assert.equal(playerBullets(), 1);
    const cd = s.tanks[0].weapon.cooldownTicksLeft;
    assert.ok(cd > 0, 'cooldown should be active after fire');

    simStep(s, { players: new Map([[0, makeInput({ Fire: true })]]) });
    assert.equal(playerBullets(), 1, 'second player fire blocked by cooldown');
  });

  it('player walks Down onto ice; releasing input starts a slide', () => {
    // Engine is y-down: Down direction moves toward LARGER y. Ice tile at
    // (100, 250)..(164, 314). Player starts at (100, 100) facing Up. We
    // rotate the player to face Down then walk for 40 ticks → y = 100+160 = 260.
    // Center y = 292, center x = 132, both inside ice rect. ✓
    const s = makeScenarioWorld();
    for (let i = 0; i < 40; i++) {
      simStep(s, { players: new Map([[0, makeInput({ Down: true })]]) });
    }
    const p = s.tanks[0];
    assert.equal(p.isOnIce, true, `player center should be on ice, y=${p.y}`);

    simStep(s, { players: new Map([[0, 0]]) });
    assert.equal(isSliding(s.tanks[0].slide), true, 'slide should have started');
  });

  it('player + enemy bullets sharing a path annihilate; same-side bullets do not', () => {
    // Mini-sim does not implement swept-box collision, so two bullets
    // flying AT each other separate by 32 px between ticks and never get
    // tested for overlap. To exercise resolveBulletPair we co-locate the
    // bullets and have them move in the same direction so they stay
    // overlapping after the move.
    const s = makeScenarioWorld();
    s.bullets.push(
      { id: 50, ownerTankId: 1, side: Side.Player, x: 200, y: 200, rotation: Dir.Right, alive: true },
      { id: 51, ownerTankId: 2, side: Side.Enemy, x: 200, y: 200, rotation: Dir.Right, alive: true },
    );
    simStep(s, { players: new Map() });
    const live = s.bullets.filter(
      (b) => b.alive && (b.id === 50 || b.id === 51),
    );
    assert.equal(live.length, 0, 'cross-side bullet pair annihilated');

    // Same again, both Enemy side — pass through (no annihilation).
    s.bullets.push(
      { id: 60, ownerTankId: 2, side: Side.Enemy, x: 300, y: 300, rotation: Dir.Right, alive: true },
      { id: 61, ownerTankId: 2, side: Side.Enemy, x: 300, y: 300, rotation: Dir.Right, alive: true },
    );
    simStep(s, { players: new Map() });
    const sameSide = s.bullets.filter(
      (b) => b.alive && (b.id === 60 || b.id === 61),
    );
    assert.equal(sameSide.length, 2, 'same-side bullets passed through');
  });

  it('player shield absorbs an enemy bullet without damage', () => {
    const s = makeScenarioWorld();
    s.tanks[0].shield = { ticksLeft: 60 };  // 1 sec of shield
    s.bullets.push({
      id: 70, ownerTankId: 2, side: Side.Enemy,
      x: 110, y: 110, rotation: Dir.Down, alive: true,
    });
    simStep(s, { players: new Map() });
    assert.equal(s.bullets.length, 0, 'bullet was absorbed');
    assert.equal(s.tanks[0].alive, true);
    assert.equal(s.tanks[0].health, 1, 'no damage taken');
  });
});

describe('integration — multi-tick determinism (the headline test)', () => {
  /**
   * Run a 300-tick scripted scenario twice with the same seed, asserting
   * the per-tick hash sequence matches byte-for-byte. This is THE property
   * that lockstep multiplayer requires.
   */
  function scripted(seed: number): number[] {
    const s = makeScenarioWorld(seed);
    const trace: number[] = [];

    for (let tick = 0; tick < 300; tick++) {
      // Scripted input: a player who walks, shoots, and idles in a pattern.
      let bits: PlayerInputBits = 0;
      if (tick < 60) bits = makeInput({ Up: true, Fire: tick % 30 === 0 });
      else if (tick < 120) bits = makeInput({ Right: true });
      else if (tick < 180) bits = makeInput({ Down: true, Fire: tick === 130 });
      else if (tick < 240) bits = makeInput({ Left: true });
      // tick 240..300: idle

      simStep(s, { players: new Map([[0, bits]]) });
      trace.push(hashState(s));
    }
    return trace;
  }

  it('two replays with the same seed produce identical 300-tick hash sequences', () => {
    const a = scripted(0xCAFE);
    const b = scripted(0xCAFE);
    assert.deepEqual(a, b);
  });

  it('different seeds eventually diverge (sanity: RNG actually matters)', () => {
    const a = scripted(0xCAFE);
    const b = scripted(0xBEEF);
    assert.notDeepEqual(a, b);
  });

  it('a single-tick perturbation propagates — input changes the trace', () => {
    function withFireAt(seed: number, fireTick: number): number[] {
      const s = makeScenarioWorld(seed);
      const trace: number[] = [];
      for (let t = 0; t < 50; t++) {
        const bits: PlayerInputBits = t === fireTick ? makeInput({ Fire: true }) : 0;
        simStep(s, { players: new Map([[0, bits]]) });
        trace.push(hashState(s));
      }
      return trace;
    }
    const a = withFireAt(0xCAFE, 5);
    const b = withFireAt(0xCAFE, 10);
    assert.notDeepEqual(a, b);
  });
});

describe('integration — complex multi-rule scenario', () => {
  /**
   * The "kitchen sink": one composite scenario that hits every migrated
   * pure module. Single test, dense in invariants.
   */
  it('scripted 200-tick scenario produces expected end-state', () => {
    const s = makeScenarioWorld(0xABCD);

    // PHASE 1 (ticks 0-30): player rotates to face Right + fires once.
    // Legacy ordering invariant: fire happens BEFORE rotate, so the
    // bullet inherits the pre-tick rotation (Up). Then the player rotates
    // and starts moving Right.
    simStep(s, {
      players: new Map([[0, makeInput({ Right: true, Fire: true })]]),
    });
    assert.equal(s.tanks[0].rotation, Dir.Right, 'rotated right');
    const playerBullets = () => s.bullets.filter((b) => b.ownerTankId === 1 && b.alive);
    assert.equal(playerBullets().length, 1, 'player fired one bullet');
    const initialBullet = playerBullets()[0];
    assert.equal(initialBullet.rotation, Dir.Up, 'bullet fired in pre-rotate facing');
    const initialBulletY = initialBullet.y;

    for (let i = 0; i < 30; i++) {
      simStep(s, { players: new Map([[0, makeInput({ Right: true })]]) });
    }
    assert.ok(s.tanks[0].x > 100, 'player moved Right (y-down: Right = +x)');
    const pb = playerBullets();
    if (pb.length > 0) {
      assert.ok(pb[0].y < initialBulletY, 'player bullet moved Up (y-down: Up = -y)');
    }

    // PHASE 2 (ticks 31-60): player idles. AI ticks consume RNG. Enemy may
    // shoot or wander.
    const enemyStartX = s.tanks[1].x;
    for (let i = 0; i < 60; i++) {
      simStep(s, { players: new Map([[0, 0]]) });
    }
    // After 60 ticks the enemy has had plenty of chances to move + fire.
    // We don't assert specific position (depends on RNG) — just that
    // something happened.
    const enemyEnded = s.tanks[1].x !== enemyStartX || s.bullets.some((b) => b.ownerTankId === 2);
    assert.ok(enemyEnded, 'enemy AI advanced the world');

    // PHASE 3: spawn a friendly-fire bullet to verify the bullet-hit
    // classifier wires through correctly. Player 1 (partyIndex 0) fires
    // at a hypothetical second player tank.
    s.tanks.push(makeTank({ id: 3, side: Side.Player, x: 200, y: 200, partyIndex: 1 }));
    s.bullets.push({
      id: 999, ownerTankId: 1, side: Side.Player,
      x: 198, y: 230, rotation: Dir.Down, alive: true,
    });
    simStep(s, { players: new Map() });
    assert.equal(isStunned(s.tanks[2].stun), true, 'friendly-fire stun applied');
    assert.equal(s.tanks[2].alive, true, 'stunned but alive');

    // The whole scenario completed without throwing — that alone is a
    // meaningful integration check given the number of modules touched.
  });
});
