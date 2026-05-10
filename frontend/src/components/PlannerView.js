import React from 'react';

const RULESETS = [
  { value: '70-hour/8-day', label: '70hr / 8-Day', cycle: 70, description: 'Daily operations - most common' },
  { value: '60-hour/7-day', label: '60hr / 7-Day', cycle: 60, description: 'Non-daily carrier operations' },
  { value: 'alaska-70-hour/7-day', label: 'Alaska 70hr / 7-Day', cycle: 70, description: 'Alaska - non-daily operations' },
  { value: 'alaska-80-hour/8-day', label: 'Alaska 80hr / 8-Day', cycle: 80, description: 'Alaska - daily operations' },
];

function PlannerView({ formData, onFormChange, onSubmit, loading, fieldErrors = {} }) {
  const selectedRuleset = RULESETS.find((ruleset) => ruleset.value === formData.hos_rules) || RULESETS[0];
  return (
    <form className="planner-form" onSubmit={onSubmit}>
      {/* FIX UI-3: align every sidebar label/input on the same field system. */}
      <div className="sidebar-section-header">Driver Info</div>
      <Field label="Driver Name" id="driver_name" name="driver_name" value={formData.driver_name} onChange={onFormChange} error={fieldErrors.driver_name} />
      <div className="input-row">
        <label className="field-group" htmlFor="hos_rules">
          <span className="field-label">Ruleset</span>
          <select className="field-input field-select" id="hos_rules" name="hos_rules" value={formData.hos_rules} onChange={onFormChange}>
            {RULESETS.map((ruleset) => (
              <option key={ruleset.value} value={ruleset.value}>{ruleset.label}</option>
            ))}
          </select>
          <small className="field-hint">{selectedRuleset.description}</small>
        </label>
        <Field label="Cycle Used" id="cycle_hours_used" name="cycle_hours_used" type="number" min="0" max={selectedRuleset.cycle} step="0.25" value={formData.cycle_hours_used} onChange={onFormChange} error={fieldErrors.cycle_hours_used} />
      </div>

      <div className="sidebar-section-header">Route</div>
      <Field label="Current Location" id="start_location" name="start_location" value={formData.start_location} onChange={onFormChange} error={fieldErrors.start_location} />
      <Field label="Pickup Location" id="pickup_location" name="pickup_location" value={formData.pickup_location} onChange={onFormChange} error={fieldErrors.pickup_location} />
      <Field label="Dropoff Location" id="end_location" name="end_location" value={formData.end_location} onChange={onFormChange} error={fieldErrors.end_location} />
      <Field label="Start Time" id="start_time" name="start_time" type="datetime-local" value={formData.start_time} onChange={onFormChange} error={fieldErrors.start_time} />
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Planning Route' : 'Plan Compliant Route'}
      </button>
    </form>
  );
}

function Field({ label, id, type = 'text', error, ...props }) {
  return (
    <label className="field-group" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input className="field-input" id={id} type={type} required {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default PlannerView;
