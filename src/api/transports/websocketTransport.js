/**
 * Experimental WebSocket transport adapter.
 *
 * This implements the same send/dispose interface as PeerJS transport and can
 * be selected as a fallback path while multiplayer reliability work continues.
 *
 * @param {{url: string}} options
 * @param {{onPacket?: function, onLifecycle?: function, onError?: function}} callbacks
 * @returns {{send: function, dispose: function, reconnect: function}}
 */
export function createWebSocketTransport(options, callbacks = {}) {
  const onPacket = callbacks.onPacket || (() => {});
  const onLifecycle = callbacks.onLifecycle || (() => {});
  const onError = callbacks.onError || (() => {});

  let socket = null;

  const attachSocket = () => {
    socket = new WebSocket(options.url);
    socket.binaryType = 'arraybuffer';
    onLifecycle({type: 'opening', transport: 'websocket', url: options.url});

    socket.addEventListener('open', () => {
      onLifecycle({type: 'open', transport: 'websocket'});
    });

    socket.addEventListener('message', event => {
      if (event.data) {
        onPacket(event.data);
      }
    });

    socket.addEventListener('error', event => {
      const error = new Error('WebSocket transport error');
      onError(error);
      onLifecycle({type: 'error', transport: 'websocket', category: 'transport_error', message: error.message, event});
    });

    socket.addEventListener('close', event => {
      onLifecycle({type: 'closed', transport: 'websocket', code: event.code, reason: event.reason});
    });
  };

  attachSocket();

  return {
    send(packet) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(packet);
      }
    },
    dispose() {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
    reconnect() {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
      onLifecycle({type: 'retrying', transport: 'websocket'});
      attachSocket();
    },
  };
}
