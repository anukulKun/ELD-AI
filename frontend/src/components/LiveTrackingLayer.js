import React, { useEffect } from 'react';
import { CircleMarker, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

const createLiveIcon = (heading) => L.divIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `
    <div class="live-marker">
      <div class="live-marker-pulse"></div>
      <div class="live-marker-ring"></div>
      <div class="live-marker-core"></div>
      ${heading != null ? `<div class="live-marker-heading" style="transform: translateX(-50%) rotate(${heading}deg);"></div>` : ''}
    </div>
  `,
});

export function LiveTrackingLayer({ position, trail, routeGeometry }) {
  const map = useMap();

  // FIX LIVE-2: auto-pan as fresh GPS positions arrive.
  useEffect(() => {
    if (position) {
      map.panTo([position.lat, position.lng], { animate: true, duration: 1 });
    }
  }, [position, map]);

  if (!position) return null;

  const drivenPath = trail.map((point) => [point.lat, point.lng]);

  return (
    <>
      {routeGeometry?.length > 1 && (
        <Polyline positions={routeGeometry} pathOptions={{ color: '#3B82F6', weight: 5, opacity: 0.55 }} />
      )}
      {drivenPath.length > 1 && (
        <Polyline
          positions={drivenPath}
          pathOptions={{
            color: '#9CA3AF',
            weight: 4,
            opacity: 0.75,
            dashArray: '6 4',
          }}
        />
      )}
      <Marker position={[position.lat, position.lng]} icon={createLiveIcon(position.heading)} zIndexOffset={1000} />
      {position.accuracy && (
        <CircleMarker
          center={[position.lat, position.lng]}
          radius={Math.min(position.accuracy / 2, 40)}
          pathOptions={{
            color: '#3B82F6',
            weight: 1,
            opacity: 0.3,
            fillOpacity: 0.05,
          }}
        />
      )}
    </>
  );
}
