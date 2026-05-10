import React from 'react';
import RouteMap from './RouteMap';
import Stat from './Stat';
import RouteOverview from './RouteOverview';
import StopsTimeline from './StopsTimeline';
import DailyLogs from './DailyLogs';
import DriverConsole from './DriverConsole';
import HistoryPage from './HistoryPage';
import { formatHours, sumLogs } from '../utils/tripPresentation';

const plannerTabs = [
  ['overview', 'Route Overview'],
  ['stops', 'Stops & Timeline'],
  ['logs', 'Daily Logs'],
];

function MainPages({ page, plannerTab, onPlannerTabChange, formData, tripPlan, history, selectedHistoryId, onHistorySelect, loading }) {
  if (page === 'dashboard') return <DriverConsole tripPlan={tripPlan} formData={formData} />;
  if (page === 'history') return <HistoryPage history={history} selectedHistoryId={selectedHistoryId} onHistorySelect={onHistorySelect} />;
  return <TripPlanner tripPlan={tripPlan} formData={formData} activeTab={plannerTab} onTabChange={onPlannerTabChange} loading={loading} />;
}

function TripPlanner({ tripPlan, formData, activeTab, onTabChange, loading }) {
  if (!tripPlan) {
    return !loading && (
      <section className="empty-state rich-empty">
        <div className="empty-icon">▰</div>
        <h1>Plan your compliant route</h1>
        <p>Enter your trip details on the left to generate an FMCSA-compliant route plan with daily log sheets.</p>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <RouteMap tripPlan={tripPlan} />
      <div className="panel-tabs">
        {plannerTabs.map(([id, label]) => (
          <button key={id} className={activeTab === id ? 'active' : ''} type="button" onClick={() => onTabChange(id)}>
            {label}{id === 'logs' ? ` (${tripPlan.daily_logs.length})` : ''}
          </button>
        ))}
      </div>
      <SummaryStats tripPlan={tripPlan} formData={formData} />
      {activeTab === 'overview' && <RouteOverview tripPlan={tripPlan} />}
      {activeTab === 'stops' && <StopsTimeline tripPlan={tripPlan} />}
      {activeTab === 'logs' && <DailyLogs tripPlan={tripPlan} formData={formData} />}
    </section>
  );
}

function SummaryStats({ tripPlan, formData }) {
  const onDuty = tripPlan.total_on_duty_hours || sumLogs(tripPlan, 'on_duty_hours');
  const cycleLimit = tripPlan.ruleset_config?.cycle || 70;
  const cycleLeft = cycleLimit - Number(formData.cycle_hours_used || tripPlan.current_cycle_hours || 0);
  const plannedStops = tripPlan.summary?.planned_stops || tripPlan.route.waypoints.length;
  return (
    <div className="stats-grid">
      <Stat label="Total Distance" value={Math.round(tripPlan.total_distance_miles)} suffix="mi" help="OSRM route dist" />
      <Stat label="Drive Time" value={formatHours(tripPlan.total_driving_hours)} suffix="" help="Behind the wheel" />
      <Stat
        label="On-Duty Time"
        value={onDuty.toFixed(1)}
        suffix="hrs"
        help={onDuty > cycleLeft ? `Exceeds available cycle (${cycleLeft.toFixed(1)}h left)` : `${(cycleLeft - onDuty).toFixed(1)}h cycle remaining`}
        tone={onDuty > cycleLeft * 0.9 ? 'danger' : ''}
      />
      <Stat label="Log Sheets" value={tripPlan.daily_logs.length} suffix="days" help={`${plannedStops} planned stops`} />
    </div>
  );
}

export default MainPages;
