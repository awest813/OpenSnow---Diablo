import websocket_open from './websocket';

// ─── FakeWebSocket ────────────────────────────────────────────────────────────

class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.binaryType = 'blob';
    this.listeners = {};
    this.sent = [];
    this.send = jest.fn(data => this.sent.push(data));
    this.close = jest.fn(() => { this.readyState = 3; });
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, handler) {
    (this.listeners[type] = this.listeners[type] || []).push(handler);
  }

  removeEventListener(type, handler) {
    const list = this.listeners[type];
    if (list) {
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit(type, event) {
    (this.listeners[type] || []).forEach(h => h(event || {}));
  }
}

/**
 * Simulate the relay server handshake.
 *
 * do_websocket_open has two sequential awaited promises:
 *  1. Wait for socket 'open' event.
 *  2. Wait for a version message (byte 0x32, then version=1 as little-endian uint32).
 *
 * Between the two awaits, versionCbk is set by the second promise's executor.
 * We need at least one micro-task tick between emitting 'open' and the version
 * message so that the executor for the second promise has time to run and set
 * versionCbk before we send the version message.
 */
async function completeHandshake(socket) {
  const versionPacket = new Uint8Array([0x32, 1, 0, 0, 0]).buffer;
  socket.readyState = 1; // OPEN
  socket.emit('open');
  // Flush the microtask that runs after the first `await` resolves so that
  // the second `await new Promise(...)` executor fires and sets versionCbk.
  await Promise.resolve();
  socket.emit('message', {data: versionPacket});
  // Flush continuation of the second await (do_websocket_open sends clientInfo
  // and returns socket), then flush websocket_open's .then() handler.
  await Promise.resolve();
  await Promise.resolve();
}

// ─── Test setup ───────────────────────────────────────────────────────────────

let originalWebSocket;
let originalVersion;

beforeEach(() => {
  originalWebSocket = global.WebSocket;
  global.WebSocket = FakeWebSocket;
  FakeWebSocket.instances = [];

  originalVersion = process.env.VERSION;
  process.env.VERSION = '1.0.39';

  jest.useFakeTimers();
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
  process.env.VERSION = originalVersion;
  jest.useRealTimers();
  jest.clearAllMocks();
});

// ─── Successful connection ─────────────────────────────────────────────────────

describe('websocket_open — successful connection', () => {
  it('calls finisher(0) after the version handshake completes', async () => {
    const finisher = jest.fn();
    websocket_open('ws://relay.test', () => {}, finisher);

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    expect(finisher).toHaveBeenCalledTimes(1);
    expect(finisher).toHaveBeenCalledWith(0);
  });

  it('sends client version info after the handshake', async () => {
    websocket_open('ws://relay.test', () => {}, jest.fn());

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    // Client info packet starts with byte 0x31
    const clientInfo = socket.sent.find(
      data => data instanceof Uint8Array && data[0] === 0x31,
    );
    expect(clientInfo).toBeTruthy();
  });

  it('forwards received messages to the handler after handshake', async () => {
    const handler = jest.fn();
    websocket_open('ws://relay.test', handler, jest.fn());

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);
    handler.mockClear(); // ignore version message forwarded to handler

    const gamePacket = new Uint8Array([0xAB, 0xCD]).buffer;
    socket.emit('message', {data: gamePacket});

    expect(handler).toHaveBeenCalledWith(gamePacket);
  });

  it('readyState reflects the underlying socket state', async () => {
    const proxy = websocket_open('ws://relay.test', () => {}, jest.fn());
    expect(proxy.readyState).toBe(0);

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    expect(proxy.readyState).toBe(1);
  });

  it('batches send() calls and flushes them over the interval', async () => {
    const proxy = websocket_open('ws://relay.test', () => {}, jest.fn());

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    // Reset the send spy so we only count post-connection sends
    socket.send.mockClear();

    proxy.send(new Uint8Array([1, 2]));
    proxy.send(new Uint8Array([3]));

    // No flush yet
    expect(socket.send).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    // One batched send
    expect(socket.send).toHaveBeenCalledTimes(1);
    const sentBuf = socket.send.mock.calls[0][0];
    // Header: byte 0 = 0x00 (batch type), bytes 1-2 = count (2)
    expect(sentBuf[0]).toBe(0);
    expect(sentBuf[1]).toBe(2);
    expect(sentBuf[2]).toBe(0);

    proxy.close();
  });

  it('does not flush when batch is empty', async () => {
    const proxy = websocket_open('ws://relay.test', () => {}, jest.fn());

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);
    socket.send.mockClear();

    jest.advanceTimersByTime(200);

    expect(socket.send).not.toHaveBeenCalled();
    proxy.close();
  });
});

// ─── close() before connection ────────────────────────────────────────────────

describe('websocket_open — close() before connection establishes', () => {
  it('calls finisher with a non-zero error code when cancelled before connect', async () => {
    const finisher = jest.fn();
    const proxy = websocket_open('ws://relay.test', () => {}, finisher);

    // Cancel before connection completes
    proxy.close();

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    expect(finisher).toHaveBeenCalledTimes(1);
    expect(finisher.mock.calls[0][0]).not.toBe(0);
  });

  it('closes the underlying socket when cancelled before connect', async () => {
    const proxy = websocket_open('ws://relay.test', () => {}, jest.fn());
    proxy.close();

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('send() after close() does not throw', () => {
    const proxy = websocket_open('ws://relay.test', () => {}, jest.fn());

    proxy.close();

    expect(() => proxy.send(new Uint8Array([1, 2, 3]))).not.toThrow();
  });

  it('send() after close() is silently dropped (no batch interval starts)', async () => {
    const finisher = jest.fn();
    const proxy = websocket_open('ws://relay.test', () => {}, finisher);

    proxy.close();
    proxy.send(new Uint8Array([42]));

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);
    socket.send.mockClear();

    // No batch interval should run since connection was cancelled
    jest.advanceTimersByTime(200);
    const batchSends = socket.send.mock.calls.filter(
      ([data]) => data instanceof Uint8Array && data[0] === 0x00,
    );
    expect(batchSends).toHaveLength(0);
  });
});

// ─── close() after connection ─────────────────────────────────────────────────

describe('websocket_open — close() after connection', () => {
  it('stops the flush interval when close() is called after connect', async () => {
    const proxy = websocket_open('ws://relay.test', () => {}, jest.fn());

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    proxy.send(new Uint8Array([1]));
    proxy.close();
    socket.send.mockClear();

    jest.advanceTimersByTime(200);

    expect(socket.send).not.toHaveBeenCalled();
  });

  it('calls ws.close() when close() is called after connection', async () => {
    const proxy = websocket_open('ws://relay.test', () => {}, jest.fn());

    const socket = FakeWebSocket.instances[0];
    await completeHandshake(socket);

    proxy.close();

    expect(socket.close).toHaveBeenCalledTimes(1);
  });
});

// ─── Connection failure ───────────────────────────────────────────────────────

describe('websocket_open — connection failure', () => {
  it('calls finisher with a non-zero error code on socket error', async () => {
    const finisher = jest.fn();
    websocket_open('ws://relay.test', () => {}, finisher);

    const socket = FakeWebSocket.instances[0];
    socket.emit('error', {});
    await Promise.resolve();
    await Promise.resolve();

    expect(finisher).toHaveBeenCalledTimes(1);
    expect(finisher.mock.calls[0][0]).not.toBe(0);
  });

  it('calls finisher with a non-zero error code when version times out', async () => {
    const finisher = jest.fn();
    websocket_open('ws://relay.test', () => {}, finisher);

    const socket = FakeWebSocket.instances[0];
    socket.readyState = 1;
    socket.emit('open');
    await Promise.resolve();

    // Advance past the 5-second version timeout
    jest.advanceTimersByTime(5001);
    await Promise.resolve();
    await Promise.resolve();

    expect(finisher).toHaveBeenCalledTimes(1);
    expect(finisher.mock.calls[0][0]).not.toBe(0);
  });
});
