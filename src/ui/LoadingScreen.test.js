import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  let container;
  let root;

  const renderWithSession = async (overrides) => {
    await act(async () => {
      root.render(
        <SessionContext.Provider value={{ ...defaultSessionValue, ...overrides }}>
          <LoadingScreen />
        </SessionContext.Provider>
      );
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('shows a spinner when total progress is unavailable', async () => {
    await renderWithSession({ progress: { text: 'Loading assets' } });

    expect(container.querySelector('.loadingSpinner')).toBeTruthy();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('shows a percent label and progress bar when totals are available', async () => {
    await renderWithSession({ progress: { text: 'Loading assets', loaded: 25, total: 100 } });

    expect(container.textContent).toContain('25%');
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute('aria-valuenow')).toBe('25');
  });

  it('renders the unified percent from the startup coordinator', async () => {
    await renderWithSession({ progress: { text: 'Loading...', percent: 73 } });

    expect(container.textContent).toContain('73%');
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute('aria-valuenow')).toBe('73');
    // No raw byte counts → no readout.
    expect(container.querySelector('.loadingBytes')).toBeNull();
  });

  it('shows the byte readout alongside a unified percent during the download', async () => {
    await renderWithSession({
      progress: {
        text: 'Downloading...',
        percent: 45,
        loaded: 25 * 1024 * 1024,
        total: 50 * 1024 * 1024,
      },
    });

    expect(container.textContent).toContain('45%');
    expect(container.querySelector('.loadingBytes').textContent).toBe('25.0 MB / 50.0 MB');
  });

  it('omits the byte readout for tiny synthetic ratios', async () => {
    await renderWithSession({ progress: { text: 'Loading assets', loaded: 25, total: 100 } });

    expect(container.querySelector('.loadingBytes')).toBeNull();
  });

  it('shows a human-readable byte readout for real downloads', async () => {
    await renderWithSession({
      progress: { text: 'Downloading data', loaded: 25 * 1024 * 1024, total: 50 * 1024 * 1024 },
    });

    const bytes = container.querySelector('.loadingBytes');
    expect(bytes).toBeTruthy();
    expect(bytes.textContent).toBe('25.0 MB / 50.0 MB');
  });

  it('clamps the loaded byte readout to the total', async () => {
    await renderWithSession({
      progress: { text: 'Downloading data', loaded: 60 * 1024 * 1024, total: 50 * 1024 * 1024 },
    });

    expect(container.querySelector('.loadingBytes').textContent).toBe('50.0 MB / 50.0 MB');
  });
});
