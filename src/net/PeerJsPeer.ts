/**
 * PeerJS implementation of the Peer interface. Wraps a single
 * `Peer.DataConnection` from the peerjs package.
 *
 * Two entry points:
 *   hostPeer()  — open a PeerJS peer with our chosen id (or auto-id) and
 *                 resolve with a Peer once a remote joiner connects.
 *   joinPeer(id) — connect to a remote PeerJS peer id and resolve when the
 *                 data channel is open.
 *
 * Both return a Promise<{peer, localId}> where `localId` is shown to the
 * user (the host) so they can share it.
 */

import Peer, { DataConnection } from 'peerjs';

import { Peer as IPeer } from './Peer';

function wrap(conn: DataConnection, isHost: boolean): IPeer {
  const messageHandlers: Array<(data: string) => void> = [];
  const closeHandlers: Array<(reason: string) => void> = [];

  conn.on('data', (data) => {
    // PeerJS may surface non-string payloads if the sender used binary;
    // we always send strings (JSON) in Phase-1 multiplayer, so cast and
    // log anything else for debugging.
    if (typeof data !== 'string') {
      // eslint-disable-next-line no-console
      console.warn('[mp] unexpected non-string payload', typeof data);
      return;
    }
    for (const h of messageHandlers) h(data);
  });
  conn.on('close', () => {
    for (const h of closeHandlers) h('peer-closed');
  });
  conn.on('error', (err) => {
    for (const h of closeHandlers) h(`error:${err.type ?? err.message ?? 'unknown'}`);
  });

  return {
    isHost,
    remoteId: conn.peer,
    send(data) {
      if (conn.open) conn.send(data);
    },
    onMessage(handler) {
      messageHandlers.push(handler);
    },
    onClose(handler) {
      closeHandlers.push(handler);
    },
    close() {
      conn.close();
    },
  };
}

export interface HostResult {
  /** The peer's id — host shares this with the joiner over an out-of-band channel. */
  localId: string;
  /** Resolved once a joiner connects. */
  ready: Promise<IPeer>;
  /** Cancel before a joiner connects. */
  cancel: () => void;
}

export function hostPeer(): HostResult {
  // Use PeerJS's default cloud signaling server for now. The path/port
  // defaults are fine; a self-hosted PeerServer can be plugged in here
  // later via the constructor options.
  const peer = new Peer();

  let cancelled = false;
  const ready = new Promise<IPeer>((resolve, reject) => {
    peer.on('open', (id) => {
      // Resolve the local-id side immediately so the UI can display it.
      // We finish the promise once a connection arrives.
      // eslint-disable-next-line no-console
      console.info('[mp] host ready, id=', id);
    });

    peer.on('connection', (conn) => {
      if (cancelled) {
        conn.close();
        return;
      }
      conn.on('open', () => {
        resolve(wrap(conn, true));
      });
    });

    peer.on('error', (err) => {
      reject(err);
    });
  });

  // localId is exposed via a separate promise wrapper resolved on 'open'.
  // We expose synchronously by reading peer.id after open; for the UI we
  // also return a Promise via the cancel/ready combo.
  const result: HostResult = {
    localId: '',
    ready,
    cancel() {
      cancelled = true;
      peer.destroy();
    },
  };

  // Patch in localId once it's available. Synchronous return is the
  // simplest API for the caller; they should await `whenHostId(result)`
  // to display the code.
  peer.on('open', (id) => {
    result.localId = id;
  });

  return result;
}

/** Convenience: wait until a HostResult has a localId assigned. */
export function whenHostId(result: HostResult): Promise<string> {
  return new Promise((resolve) => {
    const tick = () => {
      if (result.localId) resolve(result.localId);
      else setTimeout(tick, 50);
    };
    tick();
  });
}

export function joinPeer(remoteId: string): Promise<IPeer> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    peer.on('open', () => {
      const conn = peer.connect(remoteId, { reliable: true });
      conn.on('open', () => {
        // eslint-disable-next-line no-console
        console.info('[mp] joined', remoteId);
        resolve(wrap(conn, false));
      });
      conn.on('error', (err) => reject(err));
    });
    peer.on('error', (err) => reject(err));
  });
}
