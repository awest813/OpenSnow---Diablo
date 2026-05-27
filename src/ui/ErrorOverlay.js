import React from 'react';
import { buildIssueUrl, ExternalLink } from '../api/errorReporter';
import { useSession } from '../engine/sessionContext';
import DialogFrame from './DialogFrame';

export default function ErrorOverlay(props) {
  const session = useSession();
  const error = props.error || session.error;
  const retail = props.retail != null ? props.retail : session.retail;
  const saveName = props.saveName || session.saveName;
  const onReload = props.onReload || (() => window.location.reload());

  if (!error) {
    return null;
  }

  return (
    <DialogFrame className="error" role="alertdialog" ariaLabel="Game error details">
      <p className="header">Something went wrong</p>
      <p className="errorLead">The game hit an unexpected error and had to stop.</p>
      <p className="body">{error.message}</p>
      <div className="errorActions">
        <ExternalLink className="errorIssueLink" href={buildIssueUrl(error, retail)}>
          Report on GitHub
        </ExternalLink>
        {error.save != null && <a className="errorSaveLink" href={error.save} download={saveName}>Download save</a>}
      </div>
      <button type="button" className="startButton" onClick={onReload}>
        Reload game
      </button>
    </DialogFrame>
  );
}
