import React from 'react';

function DailyLogSheet({ dayData, tripInfo, tripPlan }) {
  if (!dayData) return null;
  const log = buildLog(dayData, tripInfo, tripPlan);

  // FIX LOG-4: print only the clean SVG log sheet without application chrome.
  const handlePrint = () => {
    const svg = document.querySelector('.log-svg-container svg');
    if (!svg) return;
    const win = window.open('', '_blank');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`
      <html>
        <head>
          <title>ELD Log - ${log.date}</title>
          <style>
            body { margin: 0.5in; background: #fff; }
            svg { width: 100%; max-width: 10in; }
            @page { size: letter landscape; margin: 0.5in; }
          </style>
        </head>
        <body>${svg.outerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <article className="canvas-card">
      <div className="log-sheet-controls">
        <button className="btn-secondary" type="button" onClick={handlePrint}>Print Log Sheet</button>
        <span className="log-date-label">{log.date} - Day {log.day}</span>
      </div>
      <div className="canvas-scroll print-log-sheet log-svg-container">
        <DailyLogSVG log={log} />
      </div>
    </article>
  );
}

function DailyLogSVG({ log }) {
  const W = 760;
  const GRAPH_LEFT = 130;
  const GRAPH_RIGHT = 710;
  const GRAPH_W = GRAPH_RIGHT - GRAPH_LEFT;
  const TOTAL_COL_X = 730;
  const ROW_H = 31;
  const GRAPH_TOP = 218;
  const ROWS = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty (Not Driving)'];
  const STATUS_KEYS = ['off_duty', 'sleeper', 'driving', 'on_duty'];
  const statusToRow = { off_duty: 0, sleeper: 1, driving: 2, on_duty: 3 };
  const hx = (h) => GRAPH_LEFT + (Math.max(0, Math.min(24, Number(h) || 0)) / 24) * GRAPH_W;
  const rowY = (r) => GRAPH_TOP + r * ROW_H;
  const rowMidY = (r) => rowY(r) + ROW_H / 2;
  const totals = log.totals || {};
  const grandTotal = STATUS_KEYS.reduce((sum, key) => sum + Number(totals[key] || 0), 0);
  const totalOk = Math.abs(grandTotal - 24) < 0.1;
  const hourLabel = (h) => (h === 0 || h === 24 ? 'M' : h === 12 ? 'N' : String(h));

  return (
    // FIX LOG-2: entire FMCSA sheet is rendered as one SVG to prevent header and graph overlap.
    <svg viewBox={`0 0 ${W} 580`} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', fontFamily: 'Arial, sans-serif', background: '#fff' }} role="img" aria-label={`Driver daily log ${log.date}`}>
      <rect x="0" y="0" width={W} height="580" fill="#fff" />
      <text x="10" y="28" fontSize="16" fontWeight="700" fill="#000">Driver's Daily Log</text>
      <text x="10" y="42" fontSize="10" fill="#555">(24 hours)</text>
      <line x1="280" y1="38" x2="500" y2="38" stroke="#000" strokeWidth="0.8" />
      <text x="282" y="35" fontSize="11" fill="#000">{log.date}</text>
      <text x="282" y="46" fontSize="8" fill="#888">(Month) (Day) (Year)</text>
      <text x="510" y="22" fontSize="8" fill="#555">Original - File at home terminal.</text>
      <text x="510" y="33" fontSize="8" fill="#555">Duplicate - Driver retains possession for 8 days.</text>
      <text x="510" y="44" fontSize="8" fill="#555">All times shown in home terminal timezone ({log.timezone || 'UTC'}).</text>

      <text x="10" y="65" fontSize="9" fill="#666">From:</text>
      <line x1="40" y1="66" x2="360" y2="66" stroke="#000" strokeWidth="0.8" />
      <text x="42" y="63" fontSize="11" fill="#000">{log.from || ''}</text>
      <text x="370" y="65" fontSize="9" fill="#666">To:</text>
      <line x1="388" y1="66" x2="750" y2="66" stroke="#000" strokeWidth="0.8" />
      <text x="390" y="63" fontSize="11" fill="#000">{log.to || ''}</text>

      <rect x="10" y="75" width="140" height="34" fill="none" stroke="#000" strokeWidth="0.8" />
      <text x="80" y="89" fontSize="13" fontWeight="600" fill="#000" textAnchor="middle">{formatNumber(log.daily_miles)}</text>
      <text x="80" y="103" fontSize="8" fill="#777" textAnchor="middle">Total Miles Driving Today</text>
      <rect x="155" y="75" width="140" height="34" fill="none" stroke="#000" strokeWidth="0.8" />
      <text x="225" y="89" fontSize="13" fontWeight="600" fill="#000" textAnchor="middle">{formatNumber(log.total_mileage)}</text>
      <text x="225" y="103" fontSize="8" fill="#777" textAnchor="middle">Total Mileage Today</text>
      <text x="310" y="83" fontSize="9" fill="#666">Name of Carrier or Carriers</text>
      <line x1="310" y1="92" x2="750" y2="92" stroke="#000" strokeWidth="0.8" />
      <text x="312" y="90" fontSize="11" fill="#000">{log.carrier || 'RouteGuard ELD'}</text>

      <text x="10" y="120" fontSize="9" fill="#666">Truck/Tractor and Trailer Numbers or License Plate(s)/State</text>
      <line x1="10" y1="130" x2="300" y2="130" stroke="#000" strokeWidth="0.8" />
      <text x="12" y="128" fontSize="11" fill="#000">{log.tractor || 'TRK-1042'} / {log.trailer || 'TRL-2208'}</text>
      <text x="310" y="112" fontSize="9" fill="#666">Main Office Address</text>
      <line x1="310" y1="121" x2="750" y2="121" stroke="#000" strokeWidth="0.8" />
      <text x="312" y="119" fontSize="11" fill="#000">{log.main_office || '123 Dispatch Ave, Chicago, IL 60601'}</text>
      <text x="310" y="135" fontSize="9" fill="#666">Home Terminal Address</text>
      <line x1="310" y1="144" x2="750" y2="144" stroke="#000" strokeWidth="0.8" />
      <text x="312" y="142" fontSize="11" fill="#000">{log.home_terminal || 'Home Terminal, New York, NY 10001'}</text>

      {Array.from({ length: 25 }, (_, i) => (
        <text key={i} x={hx(i)} y={GRAPH_TOP - 5} textAnchor="middle" fontSize="9" fill="#000">{hourLabel(i)}</text>
      ))}
      <text x={TOTAL_COL_X} y={GRAPH_TOP - 12} textAnchor="middle" fontSize="8" fill="#000">TOTAL</text>
      <text x={TOTAL_COL_X} y={GRAPH_TOP - 4} textAnchor="middle" fontSize="8" fill="#000">HOURS</text>

      {ROWS.map((_, ri) => <rect key={ri} x={GRAPH_LEFT} y={rowY(ri)} width={GRAPH_W} height={ROW_H} fill={ri % 2 === 0 ? '#FAFAFA' : '#F3F3F3'} />)}
      {Array.from({ length: 25 }, (_, i) => <line key={i} x1={hx(i)} y1={GRAPH_TOP} x2={hx(i)} y2={rowY(ROWS.length)} stroke={i % 6 === 0 ? '#888' : '#D0D0D0'} strokeWidth={i % 6 === 0 ? 1 : 0.5} />)}
      {Array.from({ length: 24 }, (_, hr) => [0.25, 0.5, 0.75].map((frac) => <line key={`${hr}-${frac}`} x1={hx(hr + frac)} y1={GRAPH_TOP} x2={hx(hr + frac)} y2={GRAPH_TOP + 5} stroke="#CCC" strokeWidth="0.5" />))}
      {ROWS.map((label, ri) => (
        <g key={label}>
          <text x={GRAPH_LEFT - 4} y={rowMidY(ri) + 4} textAnchor="end" fontSize="10" fill="#000">{label}</text>
          <line x1="10" y1={rowY(ri)} x2={GRAPH_RIGHT + 40} y2={rowY(ri)} stroke="#000" strokeWidth="0.75" />
        </g>
      ))}
      <line x1="10" y1={rowY(ROWS.length)} x2={GRAPH_RIGHT + 40} y2={rowY(ROWS.length)} stroke="#000" strokeWidth="1" />

      {(log.events || []).map((event, i) => {
        const row = statusToRow[event.status];
        if (row === undefined) return null;
        const x1 = hx(isoToH(event.start));
        const x2 = hx(isoToH(event.end, log.date));
        const y = rowMidY(row);
        const prev = (log.events || [])[i - 1];
        const prevRow = prev ? statusToRow[prev.status] : null;
        const prevY = prevRow != null ? rowMidY(prevRow) : null;
        return (
          <g key={`${event.status}-${event.start}-${i}`}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="#000" strokeWidth="2.5" strokeLinecap="square" />
            {prevY != null && prevRow !== row && <line x1={x1} y1={prevY} x2={x1} y2={y} stroke="#000" strokeWidth="2.5" strokeLinecap="square" />}
          </g>
        );
      })}

      {STATUS_KEYS.map((key, ri) => (
        <text key={key} x={TOTAL_COL_X} y={rowMidY(ri) + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill="#000">{Number(totals[key] || 0).toFixed(2)}h</text>
      ))}
      <text x={TOTAL_COL_X} y={rowY(ROWS.length) + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill={totalOk ? '#000' : '#CC0000'}>{grandTotal.toFixed(2)}h</text>
      {!totalOk && <text x={GRAPH_RIGHT - 5} y={rowY(ROWS.length) + 16} textAnchor="end" fontSize="9" fill="#CC0000">Must equal 24.00h</text>}

      <rect x="10" y="360" width={W - 20} height="20" fill="#EFEFEF" stroke="#000" strokeWidth="0.8" />
      <text x="16" y="374" fontSize="11" fontWeight="700" fill="#000">REMARKS</text>
      <text x="10" y="392" fontSize="8" fill="#666" fontStyle="italic">Enter place reported/released and where each duty status changed. Use home terminal time standard.</text>
      <line x1="10" y1="396" x2={W - 10} y2="396" stroke="#AAA" strokeWidth="0.5" />
      {(log.remarks || []).slice(0, 7).map((r, i) => {
        const ry = 406 + i * 14;
        return (
          <g key={`${r.time}-${i}`}>
            <text x="12" y={ry} fontSize="10" fontFamily="monospace" fill="#333">{r.time}</text>
            <text x="75" y={ry} fontSize="10" fontWeight="600" fill="#000">{r.location}</text>
            <text x="260" y={ry} fontSize="10" fill="#444">{r.text}</text>
            <text x={W - 12} y={ry} fontSize="10" fontFamily="monospace" fill="#555" textAnchor="end">{formatNumber(r.odometer_miles)} mi</text>
            <line x1="10" y1={ry + 3} x2={W - 10} y2={ry + 3} stroke="#E0E0E0" strokeWidth="0.4" />
          </g>
        );
      })}

      <text x="10" y="510" fontSize="9" fill="#666">Shipper &amp; Commodity / DVL or Manifest No.:</text>
      <line x1="230" y1="510" x2="500" y2="510" stroke="#000" strokeWidth="0.8" />
      <text x="232" y="508" fontSize="10" fill="#000">{log.shipping_documents || '-'}</text>
      <line x1="10" y1="518" x2={W - 10} y2="518" stroke="#000" strokeWidth="1" />
      <text x="10" y="532" fontSize="9" fontWeight="700" fill="#000">Recap: Complete at end of day</text>
      {[
        { label: 'A. On-duty hours today (lines 3 & 4)', value: log.recap?.on_duty_today },
        { label: 'B. Available tomorrow', value: log.recap?.available_tomorrow },
        { label: 'C. On-duty last cycle incl. today', value: log.recap?.cycle_used },
      ].map((item, i) => (
        <g key={item.label}>
          <text x={10 + i * 250} y="548" fontSize="8" fill="#555">{item.label}</text>
          <rect x={10 + i * 250} y="551" width="60" height="16" fill="none" stroke="#000" strokeWidth="0.8" />
          <text x={10 + i * 250 + 30} y="563" textAnchor="middle" fontSize="11" fontWeight="700" fill="#000">{formatNumber(item.value)}</text>
        </g>
      ))}
      <text x="10" y="578" fontSize="9" fontStyle="italic" fill="#555">I certify that these entries are true and correct.</text>
      <line x1="400" y1="575" x2="700" y2="575" stroke="#000" strokeWidth="0.8" />
      <text x="402" y="573" fontSize="11" fontStyle="italic" fill="#000">{log.driver_name || 'John Doe'}</text>
      <text x="550" y="578" fontSize="8" fill="#888" textAnchor="middle">Driver's Signature in Full</text>
    </svg>
  );
}

function buildLog(dayData, tripInfo, tripPlan) {
  const events = dayData.events?.length ? dayData.events : eventsFromSchedule(dayData);
  return {
    ...dayData,
    from: dayData.from || dayData.start_location,
    to: dayData.to || dayData.end_location,
    carrier: dayData.carrier || 'RouteGuard ELD',
    main_office: dayData.main_office || dayData.main_office_address || '123 Dispatch Ave, Chicago, IL 60601',
    home_terminal: dayData.home_terminal || 'Home Terminal, New York, NY 10001',
    tractor: dayData.tractor || 'TRK-1042',
    trailer: dayData.trailer || 'TRL-2208',
    driver_name: dayData.driver_name || tripInfo?.driver_name || tripPlan?.driver_name || 'John Doe',
    shipping_documents: dayData.shipping_documents || `LOAD-${String(dayData.date).replaceAll('-', '')}`,
    total_mileage: dayData.total_mileage ?? dayData.total_miles ?? dayData.daily_miles ?? 0,
    totals: dayData.totals || totalsFromSchedule(dayData.schedule),
    events,
    remarks: Array.isArray(dayData.remarks) && typeof dayData.remarks[0] === 'object' ? dayData.remarks : remarksFromEvents(events),
    recap: dayData.recap || {
      on_duty_today: Number(dayData.hos_summary?.on_duty_hours || 0),
      available_tomorrow: Number(dayData.hos_summary?.available_tomorrow || 0),
      cycle_used: Number(dayData.hos_summary?.cumulative_cycle_hours || 0),
    },
    timezone: dayData.timezone || tripPlan?.timezone || 'UTC',
  };
}

function eventsFromSchedule(dayData) {
  const map = { OFF_DUTY: 'off_duty', SLEEPER_BERTH: 'sleeper', DRIVING: 'driving', ON_DUTY_NOT_DRIVING: 'on_duty' };
  return (dayData.schedule || []).map((segment) => ({
    status: map[segment.status] || 'off_duty',
    start: isoForHour(dayData.date, segment.start_hour),
    end: isoForHour(dayData.date, segment.end_hour),
    location: formatLocation(segment),
    text: segment.notes || statusLabel(segment.status),
    odometer_miles: segment.odometer_miles ?? segment.miles ?? 0,
  }));
}

function remarksFromEvents(events) {
  return events.map((event) => ({
    time: formatTime(isoToH(event.start)),
    location: event.location,
    text: event.text,
    odometer_miles: event.odometer_miles,
  }));
}

function totalsFromSchedule(schedule = []) {
  const totals = { off_duty: 0, sleeper: 0, driving: 0, on_duty: 0 };
  const map = { OFF_DUTY: 'off_duty', SLEEPER_BERTH: 'sleeper', DRIVING: 'driving', ON_DUTY_NOT_DRIVING: 'on_duty' };
  schedule.forEach((segment) => {
    const key = map[segment.status];
    if (key) totals[key] += Number(segment.end_hour) - Number(segment.start_hour);
  });
  Object.keys(totals).forEach((key) => { totals[key] = Number(totals[key].toFixed(2)); });
  return totals;
}

function isoForHour(date, hour) {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCMinutes(Math.round(Number(hour || 0) * 60));
  return base.toISOString();
}

function isoToH(iso, logDate = null) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (logDate && d.toISOString().slice(0, 10) > logDate) return 24;
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

function formatTime(hour) {
  const h = Math.floor(Number(hour || 0));
  const m = Math.round((Number(hour || 0) - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatNumber(value) {
  if (value === undefined || value === null || value === '') return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function statusLabel(status) {
  return {
    OFF_DUTY: 'Off duty',
    SLEEPER_BERTH: 'Sleeper berth',
    DRIVING: 'Driving',
    ON_DUTY_NOT_DRIVING: 'On duty not driving',
  }[status] || status;
}

function formatLocation(segment) {
  const location = segment.location || '';
  if (/mile\s*\d+/i.test(location)) return `Near mile ${Math.round(segment.odometer_miles ?? segment.miles ?? 0)}`;
  return location || `Near mile ${Math.round(segment.odometer_miles ?? segment.miles ?? 0)}`;
}

export function drawELDSheet(canvas, dayData, tripInfo, tripPlan) {
  const ctx = canvas.getContext('2d');
  canvas.width = 760;
  canvas.height = 580;
  const log = buildLog(dayData, tripInfo, tripPlan);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 18px Arial';
  ctx.fillText("Driver's Daily Log", 20, 32);
  ctx.font = '12px Arial';
  ctx.fillText(`${log.date} - ${log.from} to ${log.to}`, 20, 56);
  ctx.fillText(`Daily miles: ${formatNumber(log.daily_miles)} | Total: ${formatNumber(log.total_mileage)}`, 20, 78);
}

export default DailyLogSheet;
