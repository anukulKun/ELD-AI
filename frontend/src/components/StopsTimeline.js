import React, { useMemo } from 'react';
import { buildStopRows } from '../utils/tripPresentation';

function StopsTimeline({ tripPlan }) {
  const stops = useMemo(() => buildStopRows(tripPlan), [tripPlan]);
  return (
    <div className="stops-grid">
      <section className="timeline-card">
        <div className="section-title">Trip Timeline</div>
        <div className="vertical-timeline timeline-track">
          <TimelineRow icon="S" tone="start" title={`Depart - ${tripPlan.start_location}`} meta="Pre-trip inspection | On Duty" />
          {stops.map((stop, index) => <TimelineRow key={`${stop.title}-${index}`} {...stop} />)}
          <TimelineRow icon="D" tone="dropoff" title={`Arrive - ${tripPlan.dropoff_location}`} meta="Delivery complete | Off Duty" />
        </div>
      </section>
      <section className="stop-plan-card">
        <div className="section-title">Stop Plan</div>
        {stops.map((stop, index) => (
          <div className="stop-plan-row stop-plan-item" key={`${stop.title}-plan-${index}`}>
            <div className="stop-plan-left">
              <strong className="stop-plan-title">{stop.title}</strong>
              <span className="stop-plan-location">{stop.location} - mile {stop.mile}</span>
            </div>
            <b className="stop-plan-time">{stop.time}</b>
          </div>
        ))}
      </section>
    </div>
  );
}

function TimelineRow({ icon, tone, title, meta, mile, time }) {
  return (
    <div className="timeline-entry timeline-item">
      <span className={`timeline-icon timeline-badge badge-${badgeTone(tone)} ${tone}`}>{icon}</span>
      <div className="stop-info">
        <strong className="stop-label">{title}</strong>
        <span className="stop-meta">{meta || `Mile ${mile} - ${time}`}</span>
      </div>
    </div>
  );
}

function badgeTone(tone) {
  if (tone === 'rest') return 'reset';
  if (tone === 'dropoff') return 'delivery';
  return tone || 'break';
}

export default StopsTimeline;
