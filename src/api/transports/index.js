import { createPeerJsTransport } from './peerjsTransport';
import { createWebSocketTransport } from './websocketTransport';

/**
 * @typedef {{
 *   onPacket?: function,
 *   onLifecycle?: function,
 *   onError?: function,
 * }} TransportCallbacks
 */

/**
 * @typedef {{send: function, dispose: function, reconnect?: function}} Transport
 */

const noop = () => {};

function normalizeCallbacks(callbacksOrOnPacket) {
  if (typeof callbacksOrOnPacket === 'function') {
    return {
      onPacket: callbacksOrOnPacket,
      onLifecycle: noop,
      onError: noop,
    };
  }

  return {
    onPacket: callbacksOrOnPacket?.onPacket || noop,
    onLifecycle: callbacksOrOnPacket?.onLifecycle || noop,
    onError: callbacksOrOnPacket?.onError || noop,
  };
}

/**
 * Build a multiplayer transport implementation.
 *
 * @param {{kind?: 'peerjs'|'websocket', websocketUrl?: string}} options
 * @param {TransportCallbacks | ((packet: ArrayBuffer | Uint8Array) => void)} callbacksOrOnPacket
 * @returns {Transport}
 */
export function createTransport(options = {}, callbacksOrOnPacket) {
  const callbacks = normalizeCallbacks(callbacksOrOnPacket);
  const kind = options.kind || 'peerjs';

  if (kind === 'websocket') {
    if (!options.websocketUrl) {
      throw new Error('websocketUrl is required when kind is websocket');
    }
    return createWebSocketTransport({url: options.websocketUrl}, callbacks);
  }

  return createPeerJsTransport(callbacks);
}
