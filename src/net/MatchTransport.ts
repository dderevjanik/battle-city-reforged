/**
 * Typed message layer over a raw Peer.
 *
 * Serialisation is JSON for Phase-1 multiplayer (debuggable). The
 * `send*` methods construct typed messages; the `on*` methods register
 * handlers that get called with the parsed message.
 *
 * MatchTransport does not manage match state — it only ferries typed
 * messages across the wire. The `Match` class layers state on top.
 */

import { Peer } from './Peer';
import {
  HandshakeAckMsg,
  HandshakeMsg,
  HashMsg,
  InputMsg,
  MatchMessage,
  PROTOCOL_VERSION,
  PingMsg,
} from './MatchMessage';

export type Handler<T extends MatchMessage> = (msg: T) => void;

export class MatchTransport {
  private handshakeHandlers: Handler<HandshakeMsg>[] = [];
  private handshakeAckHandlers: Handler<HandshakeAckMsg>[] = [];
  private inputHandlers: Handler<InputMsg>[] = [];
  private hashHandlers: Handler<HashMsg>[] = [];
  private pingHandlers: Handler<PingMsg>[] = [];

  constructor(public readonly peer: Peer) {
    peer.onMessage((raw) => this.dispatch(raw));
  }

  private dispatch(raw: string): void {
    let msg: MatchMessage;
    try {
      msg = JSON.parse(raw) as MatchMessage;
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[mp] dropped non-JSON payload', raw);
      return;
    }
    switch (msg.type) {
      case 'handshake':
        for (const h of this.handshakeHandlers) h(msg);
        return;
      case 'handshake-ack':
        for (const h of this.handshakeAckHandlers) h(msg);
        return;
      case 'input':
        for (const h of this.inputHandlers) h(msg);
        return;
      case 'hash':
        for (const h of this.hashHandlers) h(msg);
        return;
      case 'ping':
      case 'pong':
        for (const h of this.pingHandlers) h(msg);
        return;
    }
  }

  private send(msg: MatchMessage): void {
    this.peer.send(JSON.stringify(msg));
  }

  // ---- Senders ------------------------------------------------------------

  sendHandshake(seed: number, joinerPartyIndex: number, levelNumber: number): void {
    const msg: HandshakeMsg = {
      type: 'handshake',
      protocol: PROTOCOL_VERSION,
      seed,
      joinerPartyIndex,
      levelNumber,
    };
    this.send(msg);
  }

  sendHandshakeAck(): void {
    this.send({ type: 'handshake-ack', protocol: PROTOCOL_VERSION });
  }

  sendInput(tick: number, bits: number): void {
    this.send({ type: 'input', tick, bits });
  }

  sendHash(tick: number, hash: number): void {
    this.send({ type: 'hash', tick, hash });
  }

  // ---- Listeners ----------------------------------------------------------

  onHandshake(h: Handler<HandshakeMsg>): void { this.handshakeHandlers.push(h); }
  onHandshakeAck(h: Handler<HandshakeAckMsg>): void { this.handshakeAckHandlers.push(h); }
  onInput(h: Handler<InputMsg>): void { this.inputHandlers.push(h); }
  onHash(h: Handler<HashMsg>): void { this.hashHandlers.push(h); }
  onPing(h: Handler<PingMsg>): void { this.pingHandlers.push(h); }
}
