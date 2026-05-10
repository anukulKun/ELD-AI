import React from 'react';
import { drawELDSheet } from './DailyLogSheet';
import { driveLabel, formatHours, hoursFor } from '../utils/tripPresentation';

function HistoryPage({ history, selectedHistoryId, onHistorySelect }) {
  const selected = history.find((trip) => trip.trip_id === selectedHistoryId) || history[0];
  const selectedLogs = selected?.daily_logs || selected?.log_summaries || [];
  const canDownloadLog = Boolean(selected?.daily_logs?.[0]);

  return (
    <section className="page-stack">
      <div className="page-kicker">Records</div>
      <div className="history-header">
        <h1>Log History</h1>
        <button type="button" disabled={!canDownloadLog} onClick={() => selected && downloadCurrentLogPng(selected)}>Download Current Log</button>
      </div>
      <div className="history-grid">
        <section className="history-panel">
          <div className="section-title">Trips</div>
          {history.map((trip) => (
            <button key={trip.trip_id} className={selected?.trip_id === trip.trip_id ? 'history-trip active' : 'history-trip'} type="button" onClick={() => onHistorySelect(trip)}>
              <div>
                <strong>{trip.trip_title || `${trip.start_location} -> ${trip.pickup_location} -> ${trip.dropoff_location}`}</strong>
                <span>{trip.driver_name} | {Math.round(trip.total_distance_miles || 0)} mi | {formatHours(trip.total_driving_hours)}</span>
              </div>
              <b className={`status-pill ${trip.status?.toLowerCase() || 'ok'}`}>{trip.status || 'OK'}</b>
            </button>
          ))}
        </section>
        <section className="history-panel">
          <div className="section-title">Generated Log Sheets</div>
          {selectedLogs.map((log) => (
            <article className="history-log" key={log.day}>
              <strong>{new Date(log.date).toLocaleDateString()}</strong>
              <span>{driveLabel(log)} | On duty {log.hos_summary.on_duty_hours}h | Sleeper {hoursFor(log, 'SLEEPER_BERTH')}h</span>
            </article>
          ))}
          {selectedLogs.length === 0 && <div className="empty-state compact">No saved trips yet.</div>}
        </section>
      </div>
    </section>
  );
}

function downloadCurrentLogPng(tripPlan) {
  const dayData = tripPlan.daily_logs?.[0];
  if (!dayData) return;
  const canvas = document.createElement('canvas');
  drawELDSheet(canvas, dayData, tripPlan.form || { driver_name: tripPlan.driver_name }, tripPlan);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `routeguard-log-${dayData.date}.png`;
  link.click();
}

export default HistoryPage;
