import webrtc_open from '../webrtc';
import { buffer_reader, read_packet, client_packet, server_packet, RejectionReason } from '../packet';

const noop = () => {};

function toPacketList(data, packetTypes) {
  const payload = data instanceof Uint8Array ? data : new Uint8Array(data);
  const reader = new buffer_reader(payload);
  const decoded = read_packet(reader, packetTypes);
  if (!reader.done()) {
    throw Error('packet too large');
  }
  if (decoded.type.code === packetTypes.batch.code) {
    return decoded.packet;
  }
  return [decoded];
}

function rejectionCategory(reason) {
  switch (reason) {
  case RejectionReason.JOIN_VERSION_MISMATCH:
    return 'version_mismatch';
  case RejectionReason.JOIN_GAME_NOT_FOUND:
    return 'game_not_found';
  case RejectionReason.JOIN_INCORRECT_PASSWORD:
    return 'incorrect_password';
  case RejectionReason.JOIN_GAME_FULL:
    return 'game_full';
  default:
    return 'join_rejected';
  }
}

/**
 * PeerJS transport adapter.
 *
 * @param {{onPacket?: function, onLifecycle?: function, onError?: function}} callbacks
 * @returns {{send: function, dispose: function, reconnect: function}}
 */
export function createPeerJsTransport(callbacks = {}) {
  const onPacket = callbacks.onPacket || noop;
  const onLifecycle = callbacks.onLifecycle || noop;
  const onError = callbacks.onError || noop;

  onLifecycle({type: 'opening', transport: 'peerjs'});

  const observeInbound = packet => {
    try {
      const decodedPackets = toPacketList(packet, server_packet);
      decodedPackets.forEach(({type, packet: decoded}) => {
        switch (type.code) {
        case server_packet.join_accept.code:
          onLifecycle({type: 'connected', transport: 'peerjs', phase: 'handshake', playerIndex: decoded.index});
          break;
        case server_packet.join_reject.code:
          onLifecycle({
            type: 'error',
            transport: 'peerjs',
            category: rejectionCategory(decoded.reason),
            reason: decoded.reason,
          });
          break;
        case server_packet.disconnect.code:
          onLifecycle({type: 'disconnected', transport: 'peerjs', reason: decoded.reason, id: decoded.id});
          break;
        case server_packet.connect.code:
          onLifecycle({type: 'connected', transport: 'peerjs', id: decoded.id});
          break;
        default:
        }
      });
    } catch (error) {
      onError(error);
      onLifecycle({type: 'error', transport: 'peerjs', category: 'protocol_mismatch', message: String(error)});
    }
  };

  const observeOutbound = packet => {
    try {
      const decodedPackets = toPacketList(packet, client_packet);
      decodedPackets.forEach(({type, packet: decoded}) => {
        switch (type.code) {
        case client_packet.create_game.code:
          onLifecycle({type: 'connect_attempt', transport: 'peerjs', mode: 'host', sessionId: decoded.name});
          break;
        case client_packet.join_game.code:
          onLifecycle({type: 'connect_attempt', transport: 'peerjs', mode: 'join', sessionId: decoded.name});
          break;
        case client_packet.leave_game.code:
          onLifecycle({type: 'disconnected', transport: 'peerjs', mode: 'leave'});
          break;
        default:
        }
      });
    } catch (error) {
      onError(error);
      onLifecycle({type: 'error', transport: 'peerjs', category: 'protocol_mismatch', message: String(error)});
    }
  };

  const webrtc = webrtc_open(packet => {
    observeInbound(packet);
    onPacket(packet);
  }, {
    onLifecycle: event => onLifecycle({...event, transport: 'peerjs'}),
    onError,
  });

  return {
    send(packet) {
      observeOutbound(packet);
      webrtc.send(packet);
    },
    dispose() {
      if (webrtc.dispose) {
        webrtc.dispose();
      }
      onLifecycle({type: 'closed', transport: 'peerjs'});
    },
    reconnect() {
      onLifecycle({type: 'retrying', transport: 'peerjs'});
      if (webrtc.reconnect) {
        webrtc.reconnect();
      }
    },
  };
}
