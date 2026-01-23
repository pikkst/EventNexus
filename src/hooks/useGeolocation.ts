import { useState, useEffect, useRef } from 'react';

export interface GeolocationCoords {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onError?: (error: GeolocationPositionError) => void;
}

export const useGeolocation = (options?: UseGeolocationOptions) => {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setIsLoading(false);
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
      setError(null);
      setIsLoading(false);
    };

    const handleError = (err: GeolocationPositionError) => {
      console.error('Geolocation error:', err);
      const message =
        err.code === 1
          ? 'Location access denied'
          : err.code === 2
          ? 'Location unavailable'
          : 'Location timeout';
      setError(message);
      setIsLoading(false);
      options?.onError?.(err);
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 0,
    });

    // Watch position updates (every 5-30 seconds based on movement)
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 5000, // Up to 5s old
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [options]);

  return { coords, error, isLoading };
};
