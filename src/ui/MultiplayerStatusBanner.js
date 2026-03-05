import React from 'react';
import classNames from 'classnames';
import { useSession } from '../engine/sessionContext';

const statusLabels = {
  connecting: 'Connecting',
  connected: 'Connected',
  retrying: 'Retrying',
  failed: 'Failed',
};

const categoryLabels = {
  already_in_game: 'Already in game',
  game_not_found: 'Game not found',
  incorrect_password: 'Incorrect password',
  version_mismatch: 'Version mismatch',
  game_full: 'Game full',
  game_exists: 'Game already exists',
  disconnected: 'Disconnected',
  transport_retry: 'Reconnecting',
  transport_error: 'Connection error',
  protocol_mismatch: 'Protocol mismatch',
  manual_retry: 'Retrying',
  timeout: 'Connection timed out',
};

const COPY_FEEDBACK_DURATION_MS = 2000;

export default function MultiplayerStatusBanner(props) {
  const session = useSession();
  const status = props.status || session.multiplayerStatus;
  const category = props.category || session.multiplayerErrorCategory;
  const message = props.message || session.multiplayerMessage;
  const sessionId = props.sessionId || session.multiplayerSessionId;
  const shareUrl = props.shareUrl || session.multiplayerShareUrl;
  const dismissed = props.dismissed != null ? props.dismissed : session.multiplayerNoticeDismissed;
  const onRetry = props.onRetry || session.retryMultiplayer;
  const onReconnect = props.onReconnect || session.reconnectMultiplayer;
  const onCopySessionId = props.onCopySessionId || session.copySessionId;
  const onCopyShareLink = props.onCopyShareLink || session.copyShareLink;
  const onDismiss = props.onDismiss || session.dismissMultiplayerNotice;

  const [copiedButton, setCopiedButton] = React.useState(null);
  const copyTimerRef = React.useRef(null);

  const handleCopy = React.useCallback((action, buttonId) => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    if (action) {
      action();
    }
    setCopiedButton(buttonId);
    copyTimerRef.current = setTimeout(() => setCopiedButton(null), COPY_FEEDBACK_DURATION_MS);
  }, []);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  if (!status || status === 'idle' || dismissed) {
    return null;
  }

  const isFailure = status === 'failed';
  const isActive = status === 'connecting' || status === 'retrying';
  const friendlyCategory = category
    ? (categoryLabels[category] || category.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()))
    : null;

  return (
    <div
      className={classNames('multiplayerBanner', `multiplayerBanner-${status}`)}
      role={isFailure ? 'alert' : 'status'}
      aria-live={isFailure ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="multiplayerBanner-main">
        {isActive && (
          <span className="multiplayerBanner-spinner" aria-hidden="true"/>
        )}
        <strong className="multiplayerBanner-title">{statusLabels[status] || status}</strong>
        {friendlyCategory && <span className="multiplayerBanner-category">{friendlyCategory}</span>}
        {message && <span className="multiplayerBanner-message">{message}</span>}
      </div>
      <div className="multiplayerBanner-actions">
        {(status === 'retrying' || status === 'failed') && (
          <button type="button" onClick={onRetry}>Retry</button>
        )}
        {(status === 'failed' || status === 'connected') && (
          <button type="button" onClick={onReconnect}>Reconnect</button>
        )}
        {sessionId && (
          <button
            type="button"
            onClick={() => handleCopy(onCopySessionId, 'sessionId')}
          >
            {copiedButton === 'sessionId' ? 'Copied \u2713' : 'Copy Session ID'}
          </button>
        )}
        {shareUrl && (
          <button
            type="button"
            onClick={() => handleCopy(onCopyShareLink, 'shareLink')}
          >
            {copiedButton === 'shareLink' ? 'Copied \u2713' : 'Copy Share Link'}
          </button>
        )}
        <button type="button" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
