import React from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { LiveTrackingLayer } from './LiveTrackingLayer';
import LiveHUD from './LiveHUD';
import apiClient from '../utils/api';

const markerColors = {
  start: '#22C55E',
  pickup: '#3B82F6',
  dropoff: '#EF4444',
  fuel: '#EAB308',
  rest: '#F5A623',
};

function RouteMap({ tripPlan }) {
  const [fullscreen, setFullscreen] = React.useState(false);
  const containerRef = React.useRef(null);
  const polyline = React.useMemo(() => tripPlan?.route?.polyline || [], [tripPlan]);
  const waypoints = React.useMemo(() => tripPlan?.route?.waypoints || [], [tripPlan]);
  const { position, trail, error, isTracking, startTracking, stopTracking } = useDriverLocation();
  // FIX 3.1: include all route and stop coordinates when fitting bounds.
  const allCoordinates = [...polyline, ...waypoints.map((point) => [point.lat, point.lng])];
  const center = polyline[0] || [39.8283, -98.5795];

  const nextStop = React.useMemo(() => {
    if (!position || !waypoints.length) return null;
    return waypoints.find((stop) => haversineDistance(position, stop) > 0.5) || null;
  }, [position, waypoints]);
  const distanceToNext = nextStop ? Math.round(haversineDistance(position, nextStop)) : null;

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().then(() => {
        setFullscreen(true);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      });
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false));
    }
  };

  const toggleTracking = () => {
    if (isTracking) stopTracking();
    else startTracking();
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === containerRef.current);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // FIX LIVE-6: periodically send the recent trail to the backend for persistence.
  React.useEffect(() => {
    if (!isTracking || trail.length === 0) return undefined;
    const interval = setInterval(() => {
      apiClient.post('/trips/save-trail/', {
          trip_id: tripPlan?.trip_id,
          trail: trail.slice(-50),
          timestamp: Date.now(),
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [isTracking, trail, tripPlan?.trip_id]);

  return (
    <section ref={containerRef} className={`route-map ${fullscreen ? 'map-fullscreen' : ''}`}>
      {/* FIX LIVE-4: map header combines tracking and fullscreen controls. */}
      <MapHeader isTracking={isTracking} onToggleTracking={toggleTracking} onExpand={toggleFullscreen} fullscreen={fullscreen} />
      {error && <div className="map-tracking-error">{error}</div>}
      <MapContainer center={center} zoom={polyline.length ? 5 : 4} scrollWheelZoom className="leaflet-map">
        {tripPlan?.route?.estimated && <div className="map-banner">Route geometry unavailable - showing estimated path</div>}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polyline.length > 0 && !isTracking && <Polyline positions={polyline} pathOptions={{ color: '#3B82F6', weight: 5 }} />}
        {waypoints.map((point, index) => (
          <CircleMarker
            key={`${point.type}-${index}`}
            center={[point.lat, point.lng]}
            radius={8}
            pathOptions={{ color: '#0D0F14', weight: 2, fillColor: markerColors[point.type] || '#F5A623', fillOpacity: 1 }}
          >
            <Popup>
              {/* FIX 3.2: marker popups show type, city/state, scheduled time, and mile marker. */}
              <strong>{formatStopType(point)}</strong>
              <br />
              {point.location || point.name}
              <br />
              {point.arrival_time}
              <br />
              {point.cumulative_miles} mi
            </Popup>
          </CircleMarker>
        ))}
        {isTracking && <LiveTrackingLayer position={position} trail={trail} routeGeometry={polyline} />}
        <FitBounds positions={allCoordinates} resizeKey={`${fullscreen}`} disabled={isTracking} />
      </MapContainer>
      {isTracking && <LiveHUD position={position} nextStop={nextStop} distanceToNext={distanceToNext} />}
      <div className="route-label">{tripPlan?.route?.label}</div>
      <div className="map-legend">
        <span><i className="start" />Start</span>
        <span><i className="pickup" />Pickup</span>
        <span><i className="dropoff" />Dropoff</span>
        <span><i className="fuel" />Fuel</span>
        <span><i className="rest" />Rest</span>
        {isTracking && <span><i className="driven" />Driven trail</span>}
      </div>
    </section>
  );
}

function MapHeader({ isTracking, onToggleTracking, onExpand, fullscreen }) {
  return (
    <div className="map-header map-toolbar">
      <span className="map-label">Route Map</span>
      <div className="map-controls">
        <button className={isTracking ? 'track-btn active' : 'track-btn'} type="button" onClick={onToggleTracking}>
          {isTracking ? <><span className="track-live-dot" /> Stop Tracking</> : <>◎ Track My Location</>}
        </button>
        <button className="expand-btn map-expand-btn" type="button" onClick={onExpand}>
          {fullscreen ? 'Exit' : 'Expand Map'}
        </button>
      </div>
    </div>
  );
}

function formatStopType(point) {
  if (point.type === 'fuel') return 'Fuel';
  if (point.type === 'pickup') return 'Pickup';
  if (point.type === 'dropoff') return 'Delivery';
  if (/break/i.test(point.name)) return '30-min Break';
  if (point.type === 'rest') return '10-hr Reset';
  return point.name;
}

function FitBounds({ positions, resizeKey, disabled }) {
  const map = useMap();
  React.useEffect(() => {
    if (disabled) return undefined;
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (positions.length > 1) {
        map.fitBounds(positions, { padding: [50, 50] });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [map, positions, resizeKey, disabled]);
  return null;
}

function haversineDistance(a, b) {
  if (!a || !b) return 0;
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(aa));
}

export default RouteMap;
