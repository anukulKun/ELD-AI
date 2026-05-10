export function buildStopRows(tripPlan) {
  return (tripPlan.route?.waypoints || [])
    .filter((point) => ['fuel', 'rest'].includes(point.type))
    .map((point) => {
      const isFuel = point.type === 'fuel';
      const isBreak = /break/i.test(point.name);
      return {
        icon: isFuel ? 'F' : isBreak ? '30' : '10',
        tone: isFuel ? 'fuel' : isBreak ? 'break' : 'rest',
        title: isFuel ? 'Fuel' : isBreak ? '30-min break' : '10-hour reset',
        location: point.location || point.name,
        mile: Math.round(point.cumulative_miles),
        time: point.arrival_time,
      };
    });
}

export function buildWarnings(tripPlan) {
  return [
    ...(tripPlan.violations || []).map((text) => ({ level: 'warning', text })),
    ...(tripPlan.warnings || []).map((text) => ({ level: 'warning', text })),
    ...(tripPlan.info || []).map((text) => ({ level: 'ok', text })),
  ];
}

export function sumLogs(tripPlan, key) {
  return (tripPlan.daily_logs || []).reduce((total, log) => total + Number(log.hos_summary?.[key] || 0), 0);
}

export function hoursFor(log, status) {
  return (log.schedule || []).reduce((total, segment) => total + (segment.status === status ? segment.end_hour - segment.start_hour : 0), 0).toFixed(1);
}

export function driveLabel(log) {
  const parts = log.shift_drive_breakdown?.filter((hours) => hours > 0.01) || [log.hos_summary.driving_hours];
  if (parts.length > 1) return `Drive: ${parts.map((hours) => `${Number(hours).toFixed(1)}h`).join(' + ')}`;
  return `Drive: ${Number(parts[0] || 0).toFixed(1)}h`;
}

export function complianceBadge(tripPlan) {
  if (tripPlan.compliance_status === 'VIOLATION') return { className: 'violation', label: 'Violation', text: 'HOS violation detected - trip not safe to run' };
  if (tripPlan.warnings?.length) return { className: 'warning', label: 'Warning', text: 'HOS warning - review before dispatch' };
  return { className: 'ok', label: 'Compliant', text: 'All FMCSA rules satisfied' };
}

export function cycleRemainingTone(hours) {
  if (hours < 3) return { tone: 'danger', label: 'Critical - near cycle limit' };
  if (hours < 10) return { tone: 'warning', label: 'Warning - monitor cycle hours' };
  return { tone: '', label: '70-hour cycle' };
}

export function readTripStorage(tripId, key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`routeguard-${tripId || 'new'}-${key}`)) || fallback;
  } catch {
    return fallback;
  }
}

export function writeTripStorage(tripId, key, value) {
  localStorage.setItem(`routeguard-${tripId || 'new'}-${key}`, JSON.stringify(value));
}

export function formatHours(hours) {
  const whole = Math.floor(Number(hours || 0));
  const minutes = Math.round((Number(hours || 0) - whole) * 60);
  return minutes ? `${whole}h ${minutes}m` : `${whole}h`;
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function downloadJson(tripPlan) {
  const blob = new Blob([JSON.stringify(tripPlan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `routeguard-trip-${tripPlan.trip_id || 'plan'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
