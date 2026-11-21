import { useCallback, useState } from 'react';
import type { LatLng } from '@/lib/geo';

export type GeoStatus = 'idle' | 'locating' | 'found' | 'denied' | 'unavailable';

/** One-shot browser geolocation with a clear status for fallback messages. */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [position, setPosition] = useState<LatLng | null>(null);

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition([result.coords.latitude, result.coords.longitude]);
        setStatus('found');
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, []);

  return { status, position, locate };
}
