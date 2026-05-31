import { createStartupProgress } from './startupProgress';

describe('createStartupProgress', () => {
  function makeApi() {
    const calls = [];
    return { onProgress: (p) => calls.push(p), calls };
  }

  it('maps the download phase into the leading share of the bar', () => {
    const api = makeApi();
    const progress = createStartupProgress(api, { downloadShare: 0.9 });

    progress.download({ text: 'Downloading...', loaded: 25, total: 100 });
    const last = api.calls[api.calls.length - 1];
    // 25% of the download → 25% * 0.9 = 22.5% of the overall bar.
    expect(last.percent).toBeCloseTo(22.5);
    // Real byte counts are forwarded for the readout.
    expect(last.loaded).toBe(25);
    expect(last.total).toBe(100);
  });

  it('completes the download share at 100% local progress', () => {
    const api = makeApi();
    const progress = createStartupProgress(api, { downloadShare: 0.9 });
    progress.download({ text: 'Downloading...', loaded: 100, total: 100 });
    expect(api.calls[api.calls.length - 1].percent).toBeCloseTo(90);
  });

  it('continues the worker phase forward from the download share (never resets)', () => {
    const api = makeApi();
    const progress = createStartupProgress(api, { downloadShare: 0.9 });

    progress.download({ text: 'Downloading...', loaded: 100, total: 100 }); // → 90
    progress.worker({ text: 'Loading...', loaded: 0, total: 10 }); // → 90 (start of remainder)
    progress.worker({ text: 'Loading...', loaded: 5, total: 10 }); // → 95
    progress.worker({ text: 'Loading...', loaded: 10, total: 10 }); // → 100

    const percents = api.calls.map((c) => c.percent);
    // Strictly non-decreasing — the bar never snaps backwards.
    for (let i = 1; i < percents.length; i++) {
      expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
    }
    expect(percents[percents.length - 1]).toBeCloseTo(100);
  });

  it('suppresses the byte readout during the worker phase once a download happened', () => {
    const api = makeApi();
    const progress = createStartupProgress(api, { downloadShare: 0.9 });
    progress.download({ text: 'Downloading...', loaded: 100, total: 100 });
    progress.worker({ text: 'Loading...', loaded: 5, total: 10 });

    const last = api.calls[api.calls.length - 1];
    expect(last.loaded).toBeUndefined();
    expect(last.total).toBeUndefined();
  });

  it('gives the worker the whole bar and keeps bytes when there was no download', () => {
    const api = makeApi();
    const progress = createStartupProgress(api, { downloadShare: 0.9 });

    progress.worker({ text: 'Loading...', loaded: 1024, total: 4096 });
    const last = api.calls[api.calls.length - 1];
    expect(last.percent).toBeCloseTo(25);
    expect(last.total).toBe(4096);
  });

  it('holds the bar (updates text only) when a phase reports no total', () => {
    const api = makeApi();
    const progress = createStartupProgress(api, { downloadShare: 0.9 });
    progress.download({ text: 'Downloading...', loaded: 100, total: 100 }); // → 90
    progress.worker({ text: 'Initializing...' }); // no total

    const last = api.calls[api.calls.length - 1];
    expect(last.text).toBe('Initializing...');
    expect(last.percent).toBeCloseTo(90);
  });

  it('is a no-op when the api has no onProgress', () => {
    const progress = createStartupProgress({});
    expect(() => progress.download({ loaded: 1, total: 2 })).not.toThrow();
    expect(() => progress.worker({ loaded: 1, total: 2 })).not.toThrow();
  });
});
