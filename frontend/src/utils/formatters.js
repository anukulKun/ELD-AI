/**
 * Formatters utility for date, time, hours, and distance formatting
 */

export const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatHours = (hours) => {
  if (typeof hours !== 'number') return '0h 0m';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

export const formatDistance = (meters) => {
  if (typeof meters !== 'number') return '0 km';
  const kilometers = (meters / 1000).toFixed(2);
  return `${kilometers} km`;
};

export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number') return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const formatPercentage = (value, total) => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export const formatHOS = (hosRules) => {
  const hosMap = {
    '70-hour-8-day': '70 Hour / 8 Day',
    '60-hour-7-day': '60 Hour / 7 Day',
  };
  return hosMap[hosRules] || hosRules;
};
