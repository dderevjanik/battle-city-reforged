/**
 * Match singleton.
 *
 * Holds the agreed-upon match state (seed, party assignments) and a small
 * per-tick buffer of inbound remote inputs + hashes. Tests-against-self
 * runs without a Match; presence of `Match.current` is the only flag the
 * game uses to switch on multiplayer.
 *
 * Phase-1 (this step) is OBSERVATION ONLY: we record what arrives and
 * what we send so the developer console can diff hashes between peers.
 * No lockstep gating, no rollback, no input application.
 */

import { Peer } from './Peer';
import { MatchTransport } from './MatchTransport';
import { HashMsg, InputMsg } from './MatchMessage';

export interface RemoteTickRecord {
  bits?: number;
  hash?: number;
}

export class Match {
  static current: Match | null = null;

  /** Tick-keyed buffer of what the remote peer reported. */
  private remoteByTick = new Map<number, RemoteTickRecord>();
  /** Tick-keyed buffer of what we sent (for offline replay debugging). */
  private localByTick = new Map<number, RemoteTickRecord>();

  /** Resolved when the handshake completes and both peers know the seed. */
  readonly ready: Promise<void>;

  private resolveReady!: () => void;
  private rejectReady!: (reason?: unknown) => void;

  /** Last received hash divergences — for the console to inspect. */
  private divergedTicks: number[] = [];

  constructor(
    public readonly transport: MatchTransport,
    public readonly localPartyIndex: number,
    public readonly remotePartyIndex: number,
    public seed: number,
    public levelNumber: number,
  ) {
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    transport.onInput((msg: InputMsg) => {
      const r = this.remoteByTick.get(msg.tick) ?? {};
      r.bits = msg.bits;
      this.remoteByTick.set(msg.tick, r);
    });

    transport.onHash((msg: HashMsg) => {
      const r = this.remoteByTick.get(msg.tick) ?? {};
      r.hash = msg.hash;
      this.remoteByTick.set(msg.tick, r);
      this.checkDivergence(msg.tick);
    });

    transport.peer.onClose((reason) => {
      // eslint-disable-next-line no-console
      console.warn('[mp] peer closed:', reason);
      this.rejectReady(new Error(`peer closed: ${reason}`));
      if (Match.current === this) Match.current = null;
    });
  }

  /** Mark the handshake complete — the sim is allowed to start. */
  markReady(): void {
    this.resolveReady();
  }

  /** Called once per local sim tick. */
  recordLocalTick(tick: number, bits: number, hash: number): void {
    this.localByTick.set(tick, { bits, hash });
    this.transport.sendInput(tick, bits);
    this.transport.sendHash(tick, hash);
  }

  /** Last known remote record at a tick — undefined if not received yet. */
  getRemote(tick: number): RemoteTickRecord | undefined {
    return this.remoteByTick.get(tick);
  }

  private checkDivergence(tick: number): void {
    const local = this.localByTick.get(tick);
    const remote = this.remoteByTick.get(tick);
    if (
      local && remote &&
      local.hash !== undefined && remote.hash !== undefined &&
      local.hash !== remote.hash
    ) {
      this.divergedTicks.push(tick);
      // eslint-disable-next-line no-console
      console.error(
        `[mp] DESYNC at tick ${tick}: local=${(local.hash >>> 0).toString(16)} remote=${(remote.hash >>> 0).toString(16)}`,
      );
    }
  }

  /** For console inspection. */
  getDivergedTicks(): readonly number[] {
    return this.divergedTicks;
  }

  /** For console inspection. */
  describe(): object {
    return {
      isHost: this.transport.peer.isHost,
      localPartyIndex: this.localPartyIndex,
      remotePartyIndex: this.remotePartyIndex,
      seed: this.seed,
      levelNumber: this.levelNumber,
      remoteTicksRecorded: this.remoteByTick.size,
      localTicksRecorded: this.localByTick.size,
      divergedTickCount: this.divergedTicks.length,
      firstDivergedTick: this.divergedTicks[0] ?? null,
    };
  }
}
