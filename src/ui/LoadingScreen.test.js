import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  let container;
  let root;

  const renderWithSession = async overrides => {
    await act(async () => {
      root.render(
        <SessionContext.Provider value={{...defaultSessionValue, ...overrides}}>
          <LoadingScreen/>
        </SessionContext.Provider>,
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
    await renderWithSession({progress: {text: 'Loading assets'}});

    expect(container.querySelector('.loadingSpinner')).toBeTruthy();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('shows a percent label and progress bar when totals are available', async () => {
    await renderWithSession({progress: {text: 'Loading assets', loaded: 25, total: 100}});

    expect(container.textContent).toContain('25%');
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute('aria-valuenow')).toBe('25');
  });
});
