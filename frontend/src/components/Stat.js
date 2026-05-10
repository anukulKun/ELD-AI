import React from 'react';

function Stat({ label, value, suffix, help, tone }) {
  return (
    // FIX UI-6: route overview stat cards use the same tokenized card and number styling as the dashboard.
    <article className={`stat-card ${tone || ''}`}>
      <span className="stat-label">{label}</span>
      <div className={`stat-value ${tone || ''}`}>
        {value}{suffix && <small className="stat-unit">{suffix}</small>}
      </div>
      <p className="stat-sublabel">{help}</p>
    </article>
  );
}

export default Stat;
