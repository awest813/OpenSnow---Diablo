import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SessionContext, { defaultSessionValue } from '../engine/sessionContext';
import MultiplayerStatusBanner from './MultiplayerStatusBanner';

describe('MultiplayerStatusBanner', () => {
  let container;
  let root;

  const renderWithSession = async overrides => {
    const value = {
      ...defaultSessionValue,
      ...overrides,
    };
    await act(async () => {
      root.render(
        <SessionContext.Provider value={value}>
          <MultiplayerStatusBanner/>
        </SessionContext.Provider>,
      );
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    container.remove();
    container = null;
    root = null;
  });

  it('does not render in idle status', async () => {
    await renderWithSession({multiplayerStatus: 'idle'});
    expect(container.querySelector('.multiplayerBanner')).toBeNull();
  });

  it('renders failure state and invokes action callbacks', async () => {
    const retryMultiplayer = jest.fn();
    const reconnectMultiplayer = jest.fn();
    const copySessionId = jest.fn();
    const copyShareLink = jest.fn();
    const dismissMultiplayerNotice = jest.fn();
    await renderWithSession({
      multiplayerStatus: 'failed',
      multiplayerErrorCategory: 'game_not_found',
      multiplayerMessage: 'Session not found.',
      multiplayerSessionId: 'abc123',
      multiplayerShareUrl: 'https://example.test/?session=abc123',
      retryMultiplayer,
      reconnectMultiplayer,
      copySessionId,
      copyShareLink,
      dismissMultiplayerNotice,
    });

    expect(container.textContent).toContain('Failed');
    expect(container.textContent).toContain('Session not found.');
    const banner = container.querySelector('.multiplayerBanner');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.getAttribute('aria-live')).toBe('assertive');

    const buttons = Array.from(container.querySelectorAll('button'));
    const retryButton = buttons.find(node => node.textContent === 'Retry');
    const reconnectButton = buttons.find(node => node.textContent === 'Reconnect');
    const copySessionButton = buttons.find(node => node.textContent === 'Copy Session ID');
    const copyShareButton = buttons.find(node => node.textContent === 'Copy Share Link');
    const dismissButton = buttons.find(node => node.textContent === 'Dismiss');

    expect(retryButton).toBeTruthy();
    expect(reconnectButton).toBeTruthy();
    expect(copySessionButton).toBeTruthy();
    expect(copyShareButton).toBeTruthy();
    expect(dismissButton).toBeTruthy();

    act(() => {
      retryButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      reconnectButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      copySessionButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      copyShareButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
      dismissButton.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(retryMultiplayer).toHaveBeenCalledTimes(1);
    expect(reconnectMultiplayer).toHaveBeenCalledTimes(1);
    expect(copySessionId).toHaveBeenCalledTimes(1);
    expect(copyShareLink).toHaveBeenCalledTimes(1);
    expect(dismissMultiplayerNotice).toHaveBeenCalledTimes(1);
  });

  it('shows user-friendly category label instead of raw category key', async () => {
    await renderWithSession({
      multiplayerStatus: 'failed',
      multiplayerErrorCategory: 'game_not_found',
    });
    expect(container.textContent).toContain('Game not found');
    expect(container.textContent).not.toContain('game_not_found');
  });

  it('shows spinner for connecting state', async () => {
    await renderWithSession({multiplayerStatus: 'connecting'});
    expect(container.querySelector('.multiplayerBanner-spinner')).not.toBeNull();
  });

  it('shows spinner for retrying state', async () => {
    await renderWithSession({multiplayerStatus: 'retrying'});
    expect(container.querySelector('.multiplayerBanner-spinner')).not.toBeNull();
  });

  it('does not show spinner for connected or failed state', async () => {
    await renderWithSession({multiplayerStatus: 'connected'});
    expect(container.querySelector('.multiplayerBanner-spinner')).toBeNull();

    await renderWithSession({multiplayerStatus: 'failed'});
    expect(container.querySelector('.multiplayerBanner-spinner')).toBeNull();
  });

  it('shows copy feedback on Copy Session ID button and resets after timeout', async () => {
    const copySessionId = jest.fn();
    await renderWithSession({
      multiplayerStatus: 'connected',
      multiplayerSessionId: 'xyz',
      copySessionId,
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const copyBtn = buttons.find(node => node.textContent === 'Copy Session ID');
    expect(copyBtn).toBeTruthy();

    act(() => {
      copyBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(copySessionId).toHaveBeenCalledTimes(1);
    const feedbackBtn = Array.from(container.querySelectorAll('button'))
      .find(node => node.textContent.includes('Copied'));
    expect(feedbackBtn).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2001);
    });

    const resetBtn = Array.from(container.querySelectorAll('button'))
      .find(node => node.textContent === 'Copy Session ID');
    expect(resetBtn).toBeTruthy();
  });

  it('shows copy feedback on Copy Share Link button and resets after timeout', async () => {
    const copyShareLink = jest.fn();
    await renderWithSession({
      multiplayerStatus: 'connected',
      multiplayerShareUrl: 'https://example.test/?session=xyz',
      copyShareLink,
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const copyBtn = buttons.find(node => node.textContent === 'Copy Share Link');
    expect(copyBtn).toBeTruthy();

    act(() => {
      copyBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(copyShareLink).toHaveBeenCalledTimes(1);
    const feedbackBtn = Array.from(container.querySelectorAll('button'))
      .find(node => node.textContent.includes('Copied'));
    expect(feedbackBtn).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2001);
    });

    const resetBtn = Array.from(container.querySelectorAll('button'))
      .find(node => node.textContent === 'Copy Share Link');
    expect(resetBtn).toBeTruthy();
  });
});
