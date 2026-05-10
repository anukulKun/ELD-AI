import React from 'react';

function LogHistory({ trips, onSelectTrip }) {
  return (
    <section className="log-history">
      <div className="section-title">Recent Dispatches</div>
      {trips.length === 0 ? (
        <div className="empty-state">No trips logged yet</div>
      ) : (
        <div className="history-table">
          {trips.map((trip) => (
            <button key={trip.id} className="history-row" type="button" onClick={() => onSelectTrip(trip)}>
              <strong>{trip.start_location} -> {trip.end_location}</strong>
              <span>{trip.pickup_location || 'Direct route'}</span>
              <span>{new Date(trip.created_at || trip.start_time).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default LogHistory;
