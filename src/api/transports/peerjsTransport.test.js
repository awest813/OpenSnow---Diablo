import { write_packet, client_packet, server_packet, RejectionReason } from '../packet';
import { createPeerJsTransport } from './peerjsTransport';
import webrtc_open from '../webrtc';

jest.mock('../webrtc', () => jest.fn());

describe('createPeerJsTransport', () => {
  let inboundHandler;
  let webrtc;
  let onPacket;
  let onLifecycle;
  let onError;

  beforeEach(() => {
    onPacket = jest.fn();
    onLifecycle = jest.fn();
    onError = jest.fn();
    webrtc = {
      send: jest.fn(),
      dispose: jest.fn(),
      reconnect: jest.fn(),
    };

    webrtc_open.mockImplementation(handler => {
      inboundHandler = handler;
      return webrtc;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('emits opening lifecycle event at construction', () => {
    createPeerJsTransport({onPacket, onLifecycle, onError});
    expect(onLifecycle).toHaveBeenCalledWith({type: 'opening', transport: 'peerjs'});
  });

  it('emits connect attempt for host and forwards packet to webrtc', () => {
    const transport = createPeerJsTransport({onPacket, onLifecycle, onError});

    const packet = write_packet(client_packet.create_game, {
      cookie: 1,
      name: 'host-session',
      password: '',
      difficulty: 0,
    });
    transport.send(packet);

    expect(onLifecycle).toHaveBeenCalledWith({
      type: 'connect_attempt',
      transport: 'peerjs',
      mode: 'host',
      sessionId: 'host-session',
    });
    expect(webrtc.send).toHaveBeenCalledWith(packet);
  });

  it('emits connect attempt for join flow', () => {
    const transport = createPeerJsTransport({onPacket, onLifecycle, onError});

    transport.send(write_packet(client_packet.join_game, {
      cookie: 2,
      name: 'join-session',
      password: 'pw',
    }));

    expect(onLifecycle).toHaveBeenCalledWith({
      type: 'connect_attempt',
      transport: 'peerjs',
      mode: 'join',
      sessionId: 'join-session',
    });
  });

  it('emits connected lifecycle when join is accepted', () => {
    createPeerJsTransport({onPacket, onLifecycle, onError});
    const inbound = write_packet(server_packet.join_accept, {
      cookie: 2,
      index: 1,
      seed: 123,
      difficulty: 0,
    });

    inboundHandler(inbound);

    expect(onPacket).toHaveBeenCalledWith(inbound);
    expect(onLifecycle).toHaveBeenCalledWith({
      type: 'connected',
      transport: 'peerjs',
      phase: 'handshake',
      playerIndex: 1,
    });
  });

  it('categorizes version mismatch rejections', () => {
    createPeerJsTransport({onPacket, onLifecycle, onError});
    inboundHandler(write_packet(server_packet.join_reject, {
      cookie: 2,
      reason: RejectionReason.JOIN_VERSION_MISMATCH,
    }));

    expect(onLifecycle).toHaveBeenCalledWith({
      type: 'error',
      transport: 'peerjs',
      category: 'version_mismatch',
      reason: RejectionReason.JOIN_VERSION_MISMATCH,
    });
  });

  it('supports reconnect and dispose hooks', () => {
    const transport = createPeerJsTransport({onPacket, onLifecycle, onError});
    transport.reconnect();
    transport.dispose();

    expect(webrtc.reconnect).toHaveBeenCalledTimes(1);
    expect(webrtc.dispose).toHaveBeenCalledTimes(1);
    expect(onLifecycle).toHaveBeenCalledWith({type: 'retrying', transport: 'peerjs'});
    expect(onLifecycle).toHaveBeenCalledWith({type: 'closed', transport: 'peerjs'});
  });
});
