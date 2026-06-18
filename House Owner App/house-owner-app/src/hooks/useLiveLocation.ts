import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationValue } from '@/lib/locationTypes';
import { reverseGeocode } from '@/lib/geo';

export function useLiveLocation() {
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (active) {
            setError('Location permission is required to find nearby help');
            setLoading(false);
          }
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (!active) return;

        setLocation({
          address: geo.address,
          city: geo.city,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setError(null);
      } catch {
        if (active) setError('Could not get your live location');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { location, loading, error };
}
