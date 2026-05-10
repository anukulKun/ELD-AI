import { useEffect, useRef, useState } from 'react';

export const useDriverLocation = () => {
  const [position, setPosition] = useState(null);
  const [trail, setTrail] = useState([]);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef(null);

  // FIX LIVE-1: use browser GPS/watchPosition for live driver tracking.
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      return;
    }

    setError(null);
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };

        setPosition(newPoint);
        setTrail((prev) => {
          const next = [...prev, newPoint];
          return next.length > 500 ? next.slice(-500) : next;
        });
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => () => stopTracking(), []);

  return { position, trail, error, isTracking, startTracking, stopTracking };
};
