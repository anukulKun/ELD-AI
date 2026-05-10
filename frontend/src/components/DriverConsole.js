import React, { useState } from 'react';
import { buildStopRows, cycleRemainingTone, formatDateTime, readTripStorage, writeTripStorage } from '../utils/tripPresentation';

function DriverConsole({ tripPlan, formData }) {
  const [statusChanges, setStatusChanges] = useState(() => readTripStorage(tripPlan?.trip_id, 'statusChanges', [{ status: 'Off Duty', at: new Date().toISOString() }]));
  const [checklist, setChecklist] = useState(() => readTripStorage(tripPlan?.trip_id, 'checklist', {}));
  const status = statusChanges[0]?.status || 'Off Duty';
  const requiredStops = tripPlan ? buildStopRows(tripPlan) : [];
  const rules = tripPlan?.ruleset_config || { cycle: 70, drive: 11, window: 14 };
  const cycleTone = cycleRemainingTone(tripPlan?.summary?.cycle_remaining ?? (rules.cycle - formData.cycle_hours_used));
  const driveRemain = status === 'Driving' ? Math.max(0, (tripPlan?.summary?.drive_remaining ?? rules.drive) - 0.1).toFixed(1) : (tripPlan?.summary?.drive_remaining ?? rules.drive);
  const dutyRemain = ['Off Duty', 'Sleeper Berth'].includes(status) ? (tripPlan?.summary?.duty_window_remaining ?? rules.window) : Math.max(0, (tripPlan?.summary?.duty_window_remaining ?? rules.window) - 0.1).toFixed(1);

  const changeStatus = (nextStatus) => {
    const next = [{ status: nextStatus, at: new Date().toISOString() }, ...statusChanges].slice(0, 3);
    setStatusChanges(next);
    writeTripStorage(tripPlan?.trip_id, 'statusChanges', next);
  };

  const toggleChecklist = (item) => {
    const next = { ...checklist, [item]: !checklist[item] };
    setChecklist(next);
    writeTripStorage(tripPlan?.trip_id, 'checklist', next);
  };

  return (
    <section className="hos-dashboard">
      <h1 className="hos-page-title">HOS Dashboard</h1>
      <p className="hos-page-subtitle">Driver console, current duty context, and required stop plan.</p>
      <div className="hos-stat-grid">
        <HosStat label="Drive Remain" value={driveRemain} suffix="hrs" sub="11-hour limit" />
        <HosStat label="Duty Window" value={dutyRemain} suffix="hrs" sub={`Start ${formatDateTime(tripPlan?.summary?.shift_start)} | Expires ${formatDateTime(tripPlan?.summary?.window_expires)}`} />
        <HosStat label="Cycle Remain" value={tripPlan?.summary?.cycle_remaining ?? (rules.cycle - formData.cycle_hours_used)} suffix="hrs" sub={cycleTone.label} tone={cycleTone.tone} />
        <HosStat label="Next Stop" value={tripPlan?.summary?.next_stop_miles ?? 0} suffix="mi" sub={tripPlan?.summary?.next_stop_type || 'Plan route'} />
      </div>
      <div className="hos-content-grid">
        <section className="hos-card">
          <div className="hos-card-title">Duty Status</div>
          <div className={`status-indicator ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</div>
          <div className="duty-status-row">
            {['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty'].map((item) => (
              <button key={item} className={status === item ? 'duty-btn active' : 'duty-btn'} type="button" onClick={() => changeStatus(item)}>{item}</button>
            ))}
          </div>
          <div className="status-log">{statusChanges.map((entry) => <span key={`${entry.status}-${entry.at}`}>Status changed to {entry.status} at {formatDateTime(entry.at)}</span>)}</div>
          <p>Current duty status changes the driver's operational state for the dashboard. Trip planning still uses the route start time and FMCSA ruleset.</p>
        </section>
        <section className="hos-card">
          <div className="hos-card-title">Pre-Trip Checklist</div>
          {['Vehicle inspection completed', 'Shipping documents verified', 'Trailer, seal, and load secured'].map((item) => (
            <label className="checklist-item" key={item}>
              <input className="sr-only" type="checkbox" checked={!!checklist[item]} onChange={() => toggleChecklist(item)} />
              <span className={checklist[item] ? 'checklist-checkbox checked' : 'checklist-checkbox'}>{checklist[item] ? '✓' : ''}</span>
              <span>{item}</span>
            </label>
          ))}
        </section>
      </div>
      <section className="required-stops-card">
        <div className="section-title">Required Stops</div>
        {requiredStops.map((stop, index) => (
          <div className="stop-plan-row" key={`${stop.title}-required-${index}`}>
            <div><strong>{stop.title}</strong><span>{stop.location} | mile {stop.mile}</span></div>
            <b>{stop.time}</b>
          </div>
        ))}
      </section>
    </section>
  );
}

function HosStat({ label, value, suffix, sub, tone = '' }) {
  return (
    <article className="hos-stat-card">
      <div className="hos-stat-label">{label}</div>
      <div className={`hos-stat-value ${tone}`}>{value}<span>{suffix}</span></div>
      <div className="hos-stat-sub">{sub}</div>
    </article>
  );
}

export default DriverConsole;
