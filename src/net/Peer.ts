/**
 * Transport-agnostic peer abstraction.
 *
 * The rest of the multiplayer code (MatchTransport, Match, lockstep loop)
 * depends only on this interface, not on PeerJS or WebRTC directly. Two
 * reasons: (1) tests can substitute an in-memory peer with simulated
 * latency, (2) we can swap PeerJS for raw WebRTC + self-hosted signaling
 * later without touching the game code.
 *
 * A Peer is a single connection to one other peer. It is established
 * (either as host or joiner) before being handed to MatchTransport.
 */

export interface Peer {
  /** Send a raw payload to the other peer. */
  send(data: string): void;

  /** Register a listener for messages from the other peer. */
  onMessage(handler: (data: string) => void): void;

  /** Register a listener for unexpected disconnects. */
  onClose(handler: (reason: string) => void): void;

  /** Close the connection. Safe to call repeatedly. */
  close(): void;

  /**
   * True iff this peer initiated the connection. The host's `partyIndex` is
   * 0 by convention; the joiner is 1.
   */
  readonly isHost: boolean;

  /**
   * Stable string identifier of the OTHER peer, useful for logging. For
   * PeerJS this is the remote peer ID.
   */
  readonly remoteId: string;
}
