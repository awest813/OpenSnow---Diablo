import React from 'react';
import { useSession } from '../engine/sessionContext';

export default function LoadingScreen({ progress: progressProp }) {
  const {progress: sessionProgress} = useSession();
  const progress = progressProp || sessionProgress;

  return (
    <div className="loading" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
      {(progress && progress.text) || 'Loading...'}
      {progress != null && !!progress.total && (
        <span className="progressBar">
          <span>
            <span
              style={{width: `${Math.round(100 * progress.loaded / progress.total)}%`}}
              role="progressbar"
              aria-label="Loading progress"
              aria-valuenow={Math.round(100 * progress.loaded / progress.total)}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </span>
        </span>
      )}
    </div>
  );
}
