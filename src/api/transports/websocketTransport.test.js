import { createWebSocketTransport } from './websocketTransport';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.binaryType = 'blob';
    this.listeners = new Map();
    this.send = jest.fn();
    this.close = jest.fn(() => {
      this.readyState = 3;
      this.emit('close', {code: 1000, reason: 'closed'});
    });
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  emit(type, event = {}) {
    const handlers = this.listeners.get(type) || [];
    handlers.forEach(handler => handler(event));
  }
}

describe('createWebSocketTransport', () => {
  let OriginalWebSocket;

  beforeEach(() => {
    OriginalWebSocket = global.WebSocket;
    FakeWebSocket.instances = [];
    global.WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    global.WebSocket = OriginalWebSocket;
    jest.clearAllMocks();
  });

  it('emits lifecycle and forwards message packets', () => {
    const onPacket = jest.fn();
    const onLifecycle = jest.fn();
    const onError = jest.fn();
    createWebSocketTransport({url: 'wss://relay.test/ws'}, {onPacket, onLifecycle, onError});
    const socket = FakeWebSocket.instances[0];

    expect(onLifecycle).toHaveBeenCalledWith({
      type: 'opening',
      transport: 'websocket',
      url: 'wss://relay.test/ws',
    });

    socket.readyState = FakeWebSocket.OPEN;
    socket.emit('open');
    socket.emit('message', {data: new Uint8Array([1, 2]).buffer});

    expect(onLifecycle).toHaveBeenCalledWith({type: 'open', transport: 'websocket'});
    expect(onPacket).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('sends only while socket is open', () => {
    const transport = createWebSocketTransport({url: 'wss://relay.test/ws'});
    const socket = FakeWebSocket.instances[0];

    transport.send(new Uint8Array([1]));
    expect(socket.send).not.toHaveBeenCalled();

    socket.readyState = FakeWebSocket.OPEN;
    const packet = new Uint8Array([5, 6]).buffer;
    transport.send(packet);
    expect(socket.send).toHaveBeenCalledWith(packet);
  });

  it('reconnects by creating a new socket and emitting retrying', () => {
    const onLifecycle = jest.fn();
    const transport = createWebSocketTransport({url: 'wss://relay.test/ws'}, {onLifecycle});
    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.readyState = FakeWebSocket.OPEN;

    transport.reconnect();

    expect(firstSocket.close).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(onLifecycle).toHaveBeenCalledWith({type: 'retrying', transport: 'websocket'});
  });
});
