/**
 * Wire format for the multiplayer match.
 *
 * Phase 1 of multiplayer (transport + handshake + observation) uses JSON
 * messages for debuggability. When latency starts mattering we can switch
 * to a compact binary encoding (Uint8Array via DataView) without changing
 * the protocol — only the (de)serialisation.
 *
 * All numeric fields are plain non-negative integers so an eventual binary
 * encoding maps cleanly to fixed-width fields.
 */

export type MatchMessage =
  | HandshakeMsg
  | HandshakeAckMsg
  | InputMsg
  | HashMsg
  | PingMsg;

/**
 * Host → joiner, sent immediately on connection. Contains the agreed match
 * seed and the joiner's assigned `partyIndex`.
 *
 * Both peers seed their PRNG with `seed`, then start their sims at tick 0
 * once both have acknowledged.
 */
export interface HandshakeMsg {
  type: 'handshake';
  /** Match-wide PRNG seed; goes into seedGameRandom() on both peers. */
  seed: number;
  /** Party index assigned to the joiner (host is always 0; joiner is 1). */
  joinerPartyIndex: number;
  /** Level to play; both peers must agree on level state. */
  levelNumber: number;
  /** Protocol version — bump when the wire format changes. */
  protocol: number;
}

export interface HandshakeAckMsg {
  type: 'handshake-ack';
  /** Echoed back so the host can confirm the joiner understood the format. */
  protocol: number;
}

/**
 * Per-tick player input. Sent every sim tick by each peer. Even when bits
 * are 0 (no buttons held) we still emit it so the other peer can confirm
 * "yes, I made it to tick N with no input" — important once lockstep
 * gating is added.
 */
export interface InputMsg {
  type: 'input';
  tick: number;
  /** PlayerInputBits — see src/sim/Input.ts. */
  bits: number;
}

/**
 * Per-tick state hash for desync detection. Logged on receipt; once
 * lockstep is in place this is what fires the "DESYNC at tick N" alert.
 */
export interface HashMsg {
  type: 'hash';
  tick: number;
  hash: number;
}

/** Round-trip latency probe — `t` is the sender's millisecond timestamp. */
export interface PingMsg {
  type: 'ping' | 'pong';
  t: number;
}

export const PROTOCOL_VERSION = 1;
