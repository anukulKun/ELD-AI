import React, { useState } from 'react';
import DailyLogSheet from './DailyLogSheet';
import { downloadJson, driveLabel, formatDate } from '../utils/tripPresentation';

function DailyLogs({ tripPlan, formData }) {
  const [activeLog, setActiveLog] = useState(0);
  const active = tripPlan.daily_logs[activeLog] || tripPlan.daily_logs[0];
  return (
    <div className="daily-log-layout">
      <aside className="log-day-list">
        <div className="section-title">Log Days</div>
        {tripPlan.daily_logs.map((log, index) => (
          <button key={log.day} className={activeLog === index ? 'active' : ''} type="button" onClick={() => setActiveLog(index)}>
            <strong>{formatDate(log.date)}</strong>
            <span>{driveLabel(log)}</span>
          </button>
        ))}
        <button className="download-data" type="button" onClick={() => window.print()}>Print Log Sheet</button>
        <button className="download-data" type="button" onClick={() => downloadJson(tripPlan)}>Download JSON</button>
      </aside>
      <DailyLogSheet dayData={active} tripInfo={formData} tripPlan={tripPlan} />
      <div className="print-all-logs">
        {tripPlan.daily_logs.map((log) => <DailyLogSheet key={`print-${log.day}`} dayData={log} tripInfo={formData} tripPlan={tripPlan} />)}
      </div>
    </div>
  );
}

export default DailyLogs;
