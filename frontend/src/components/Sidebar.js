import React, { useState } from 'react';
import PlannerView from './PlannerView';

const RULESET_LIMITS = {
  '70-hour/8-day': { drive: 11, window: 14, cycle: '70 hrs / 8 days' },
  '60-hour/7-day': { drive: 11, window: 14, cycle: '60 hrs / 7 days' },
  'alaska-70-hour/7-day': { drive: 15, window: 20, cycle: '70 hrs / 7 days' },
  'alaska-80-hour/8-day': { drive: 15, window: 20, cycle: '80 hrs / 8 days' },
};

function Sidebar({ formData, loading, tripPlan, history, onFormChange, onSubmit, onPageChange, onPlannerTabChange, onHistorySelect, onClearActiveTrip, fieldErrors }) {
  const [tab, setTab] = useState('new');
  const limits = RULESET_LIMITS[formData.hos_rules] || RULESET_LIMITS['70-hour/8-day'];

  return (
    <aside className="sidebar">
      {/* FIX UI-3: keep tabs fixed while sidebar content scrolls independently with hidden scrollbars. */}
      <div className="sidebar-tabs">
        <button className={tab === 'new' ? 'sidebar-tab active' : 'sidebar-tab'} type="button" onClick={() => setTab('new')}>New Trip</button>
        <button className={tab === 'recent' ? 'sidebar-tab active' : 'sidebar-tab'} type="button" onClick={() => setTab('recent')}>Recent</button>
        <button className={tab === 'limits' ? 'sidebar-tab active' : 'sidebar-tab'} type="button" onClick={() => setTab('limits')}>HOS Limits</button>
      </div>

      <div className="sidebar-content">
        {tripPlan && (
          <section className="active-trip-card">
            <div className="active-trip-label">Active Trip</div>
            <strong className="active-trip-route">{tripTitle(tripPlan)}</strong>
            <span className="active-trip-meta">{Math.round(tripPlan.total_distance_miles)} mi | ETA {formatDateTime(tripPlan.summary?.eta)}</span>
            <div className="trip-progress-bar"><span className="trip-progress-fill" style={{ width: `${tripProgress(tripPlan)}%` }} /></div>
            <div className="sidebar-action-row">
              <button className="btn-secondary" type="button" onClick={() => { onPageChange('planner'); onPlannerTabChange('logs'); }}>View Logs</button>
              <button className="btn-secondary" type="button" onClick={() => onPageChange('dashboard')}>View HOS</button>
              <button className="btn-secondary clear-active" type="button" onClick={onClearActiveTrip}>Clear Active</button>
            </div>
          </section>
        )}

        {tab === 'new' && <PlannerView formData={formData} loading={loading} onFormChange={onFormChange} onSubmit={onSubmit} fieldErrors={fieldErrors} />}
        {tab === 'recent' && (
          <div className="recent-list">
            {history.length === 0 ? <p>No saved trips yet.</p> : history.map((trip) => (
              <button key={trip.trip_id} type="button" onClick={() => onHistorySelect(trip)}>
                <strong>{tripTitle(trip)}</strong>
                <span>{trip.driver_name} | {Math.round(trip.total_distance_miles)} mi</span>
              </button>
            ))}
          </div>
        )}
        {tab === 'limits' && (
          <div className="limits-list">
            {/* FIX RULESET-2: limits panel follows the selected FMCSA/Alaska ruleset. */}
            <Limit label="Driving Limit" value={`${limits.drive} hrs`} />
            <Limit label="Duty Window" value={`${limits.window} hrs`} />
            <Limit label="Break Required" value="After 8 driving hrs" />
            <Limit label="Off-Duty Reset" value="10 consecutive hrs" />
            <Limit label="Cycle Limit" value={limits.cycle} />
            <Limit label="Fuel Interval" value="Every 1,000 mi" />
          </div>
        )}
      </div>
    </aside>
  );
}

function tripTitle(tripPlan) {
  return tripPlan.trip_title || `${tripPlan.start_location} -> ${tripPlan.pickup_location} -> ${tripPlan.dropoff_location}`;
}

function tripProgress(tripPlan) {
  const start = new Date(tripPlan.start_time).getTime();
  const end = new Date(tripPlan.summary?.eta).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}

function Limit({ label, value }) {
  return (
    <div className="limit-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default Sidebar;
