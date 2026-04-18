import { createLazyMultiplayerTransport } from './lazyMultiplayerTransport';

describe('createLazyMultiplayerTransport', () => {
  it('does not create the transport until the first send', () => {
    const send = jest.fn();
    const createTransport = jest.fn(() => ({send, dispose: jest.fn()}));
    const transport = createLazyMultiplayerTransport({createTransport});

    expect(createTransport).not.toHaveBeenCalled();

    transport.send('packet');

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('packet');
  });

  it('creates the transport on reconnect when none exists yet', () => {
    const reconnect = jest.fn();
    const createTransport = jest.fn(() => ({send: jest.fn(), dispose: jest.fn(), reconnect}));
    const transport = createLazyMultiplayerTransport({createTransport});

    transport.reconnect();

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(reconnect).not.toHaveBeenCalled();
  });

  it('delegates reconnect to the active transport when available', () => {
    const reconnect = jest.fn();
    const createTransport = jest.fn(() => ({send: jest.fn(), dispose: jest.fn(), reconnect}));
    const transport = createLazyMultiplayerTransport({createTransport});

    transport.send('packet');
    transport.reconnect();

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it('replace disposes the active transport and creates a fresh one', () => {
    const disposeFirst = jest.fn();
    const disposeSecond = jest.fn();
    const first = {send: jest.fn(), dispose: disposeFirst, reconnect: jest.fn()};
    const second = {send: jest.fn(), dispose: disposeSecond, reconnect: jest.fn()};
    const createTransport = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const transport = createLazyMultiplayerTransport({createTransport});

    transport.send('packet');
    transport.replace();

    expect(disposeFirst).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledTimes(2);
    transport.dispose();
    expect(disposeSecond).toHaveBeenCalledTimes(1);
  });

  it('dispose is safe before any transport has been created', () => {
    const createTransport = jest.fn(() => ({send: jest.fn(), dispose: jest.fn()}));
    const transport = createLazyMultiplayerTransport({createTransport});

    expect(() => transport.dispose()).not.toThrow();
    expect(createTransport).not.toHaveBeenCalled();
  });
});
