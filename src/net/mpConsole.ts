/**
 * Console-driven multiplayer entry points.
 *
 * Phase-1 multiplayer (no UI yet) is driven from devtools:
 *
 *   const code = await mpHost();       // prints code; share with friend
 *   await mpJoin('PEER-CODE-HERE');     // joiner side
 *
 * Both return when the handshake completes. Then start a level normally;
 * LevelPlayScene picks up Match.current and uses the agreed seed.
 *
 * Once we have a lobby scene this file goes away — but for two-tab dev
 * testing the console helpers are the quickest path.
 */

import { Match } from './Match';
import { MatchTransport } from './MatchTransport';
import { Peer } from './Peer';
import { hostPeer, joinPeer, whenHostId } from './PeerJsPeer';
import { PROTOCOL_VERSION } from './MatchMessage';

const DEFAULT_LEVEL = 1;

/**
 * Host a match. Returns the code the host should share with the joiner.
 * The returned Promise resolves to the code IMMEDIATELY (once PeerJS has
 * assigned an id); the handshake itself completes asynchronously.
 *
 * Usage:
 *   const code = await mpHost(); // share code with joiner
 *   await Match.current.ready;   // wait for joiner + handshake
 */
async function mpHost(seed?: number, levelNumber = DEFAULT_LEVEL): Promise<string> {
  if (Match.current !== null) {
    throw new Error('A match is already active; close it first.');
  }
  const matchSeed = seed ?? (Math.floor(Math.random() * 0x7fffffff) | 1);
  const result = hostPeer();
  const code = await whenHostId(result);

  // eslint-disable-next-line no-console
  console.info(
    `[mp] hosting; share this code with the joiner:\n  ${code}\n` +
    `[mp] match seed = ${matchSeed.toString(16)}; level = ${levelNumber}`,
  );

  // Wait for joiner to connect, then send handshake.
  result.ready
    .then((peer) => attachHost(peer, matchSeed, levelNumber))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[mp] host failed:', err);
    });

  return code;
}

function attachHost(peer: Peer, seed: number, levelNumber: number): void {
  const transport = new MatchTransport(peer);
  const match = new Match(
    transport,
    /*localPartyIndex=*/ 0,
    /*remotePartyIndex=*/ 1,
    seed,
    levelNumber,
  );
  Match.current = match;

  transport.sendHandshake(seed, 1, levelNumber);
  transport.onHandshakeAck(() => {
    // eslint-disable-next-line no-console
    console.info('[mp] handshake complete (host side)');
    match.markReady();
  });
}

/**
 * Join a host using their code. Resolves when the handshake completes.
 */
async function mpJoin(remoteCode: string): Promise<void> {
  if (Match.current !== null) {
    throw new Error('A match is already active; close it first.');
  }
  const peer = await joinPeer(remoteCode);
  const transport = new MatchTransport(peer);

  return new Promise<void>((resolve, reject) => {
    transport.onHandshake((msg) => {
      if (msg.protocol !== PROTOCOL_VERSION) {
        const reason = `protocol mismatch: local=${PROTOCOL_VERSION} remote=${msg.protocol}`;
        // eslint-disable-next-line no-console
        console.error('[mp]', reason);
        peer.close();
        reject(new Error(reason));
        return;
      }
      const match = new Match(
        transport,
        /*localPartyIndex=*/ msg.joinerPartyIndex,
        /*remotePartyIndex=*/ msg.joinerPartyIndex === 0 ? 1 : 0,
        msg.seed,
        msg.levelNumber,
      );
      Match.current = match;
      transport.sendHandshakeAck();
      match.markReady();
      // eslint-disable-next-line no-console
      console.info('[mp] handshake complete (joiner side):', match.describe());
      resolve();
    });
  });
}

function mpClose(): void {
  if (Match.current === null) return;
  Match.current.transport.peer.close();
  Match.current = null;
  // eslint-disable-next-line no-console
  console.info('[mp] match closed');
}

function mpStatus(): object | string {
  if (Match.current === null) return 'no active match';
  return Match.current.describe();
}

/**
 * Install the console helpers on window so devtools can call them.
 * Idempotent — safe to call multiple times.
 */
export function installMpConsole(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = globalThis as any;
  if (w.__mpInstalled) return;
  w.mpHost = mpHost;
  w.mpJoin = mpJoin;
  w.mpClose = mpClose;
  w.mpStatus = mpStatus;
  w.__mpInstalled = true;
  // eslint-disable-next-line no-console
  console.info(
    '[mp] console helpers ready:\n' +
    '  mpHost()        — start hosting; returns code to share\n' +
    '  mpJoin("code")  — join a hosted match\n' +
    '  mpStatus()      — inspect current match\n' +
    '  mpClose()       — end the current match',
  );
}
