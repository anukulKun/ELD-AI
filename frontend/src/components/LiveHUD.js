import React from 'react';

function LiveHUD({ position, nextStop, distanceToNext }) {
  if (!position) return null;

  const speedMph = position.speed != null ? Math.round(position.speed * 2.237) : null;

  return (
    // FIX LIVE-3: floating live map HUD with speed and next-stop distance.
    <div className="live-hud">
      <div className="live-badge">
        <span className="live-dot" />
        LIVE
      </div>
      <div className="live-stat">
        <span className="live-stat-value">{speedMph != null ? speedMph : '-'}</span>
        <span className="live-stat-unit">mph</span>
      </div>
      {nextStop && (
        <div className="live-next-stop">
          <span className="live-next-label">Next stop</span>
          <span className="live-next-name">{nextStop.label || nextStop.name}</span>
          <span className="live-next-dist">{distanceToNext} mi</span>
        </div>
      )}
    </div>
  );
}

export default LiveHUD;
