import React from 'react';
import { useSession } from '../engine/sessionContext';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'];

// Format a byte count into a short human-readable string (e.g. "24.3 MB").
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return null;
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const decimals = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(decimals)} ${BYTE_UNITS[unit]}`;
}

export default function LoadingScreen({ progress: progressProp }) {
  const { progress: sessionProgress } = useSession();
  const progress = progressProp || sessionProgress;
  // The startup coordinator emits a unified, monotonic `percent`; other callers
  // (e.g. the MPQ compressor) may still send raw loaded/total ratios.
  const hasPercent = progress != null && Number.isFinite(progress.percent);
  const hasRatio =
    progress != null &&
    Number.isFinite(progress.total) &&
    progress.total > 0 &&
    Number.isFinite(progress.loaded);
  const hasProgress = hasPercent || hasRatio;
  let percent = null;
  if (hasPercent) {
    percent = Math.max(0, Math.min(100, Math.round(progress.percent)));
  } else if (hasRatio) {
    percent = Math.max(0, Math.min(100, Math.round((100 * progress.loaded) / progress.total)));
  }
  // Only surface a byte readout for real downloads (not the small synthetic
  // ratios used internally), so users can gauge how much is left.
  const showBytes =
    progress != null &&
    Number.isFinite(progress.total) &&
    progress.total >= 1024 &&
    Number.isFinite(progress.loaded);
  const bytesLabel = showBytes
    ? `${formatBytes(Math.min(progress.loaded, progress.total))} / ${formatBytes(progress.total)}`
    : null;

  return (
    <div className="loading" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
      <div className="loadingText">{(progress && progress.text) || 'Loading...'}</div>
      {hasProgress ? (
        <div className="progressBarWrap">
          <div className="loadingMeta" aria-hidden="true">
            <span className="loadingPercent">{percent}%</span>
            {bytesLabel && <span className="loadingBytes">{bytesLabel}</span>}
          </div>
          <span className="progressBar">
            <span>
              <span
                style={{ width: `${percent}%` }}
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
        <span className="loadingSpinner" aria-hidden="true" />
      )}
    </div>
  );
}
