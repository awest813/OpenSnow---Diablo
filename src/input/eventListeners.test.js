import createEventListeners from './eventListeners';

describe('eventListeners utility', () => {
  it('attaches and detaches each binding exactly once', () => {
    const calls = [];
    const targetA = {
      addEventListener: (...args) => calls.push(['addA', ...args]),
      removeEventListener: (...args) => calls.push(['removeA', ...args]),
    };
    const targetB = {
      addEventListener: (...args) => calls.push(['addB', ...args]),
      removeEventListener: (...args) => calls.push(['removeB', ...args]),
    };

    const options = { capture: true, passive: false };
    const handlers = {
      onA: () => {},
      onB: () => {},
    };

    const listeners = createEventListeners([
      { target: targetA, event: 'foo', handler: handlers.onA, options: true },
      { target: targetB, event: 'bar', handler: handlers.onB, options },
    ]);

    listeners.attach();
    listeners.attach();
    listeners.detach();
    listeners.detach();

    expect(calls).toEqual([
      ['addA', 'foo', handlers.onA, true],
      ['addB', 'bar', handlers.onB, options],
      ['removeA', 'foo', handlers.onA, true],
      ['removeB', 'bar', handlers.onB, options],
    ]);
  });
});
