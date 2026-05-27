import React from 'react';
import { useSession } from '../engine/sessionContext';

export default function LoadingScreen({ progress: progressProp }) {
  const {progress: sessionProgress} = useSession();
  const progress = progressProp || sessionProgress;
  const hasProgress = progress != null && Number.isFinite(progress.total) && progress.total > 0;
  const percent = hasProgress ? Math.max(0, Math.min(100, Math.round(100 * progress.loaded / progress.total))) : null;

  return (
    <div className="loading" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
      <div className="loadingText">{(progress && progress.text) || 'Loading...'}</div>
      {hasProgress ? (
        <div className="progressBarWrap">
          <div className="loadingPercent" aria-hidden="true">{percent}%</div>
          <span className="progressBar">
            <span>
              <span
                style={{width: `${percent}%`}}
                role="progressbar"
                aria-label="Loading progress"
                aria-valuenow={percent}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </span>
          </span>
        </div>
      ) : (
        <span className="loadingSpinner" aria-hidden="true"/>
      )}
    </div>
  );
}
