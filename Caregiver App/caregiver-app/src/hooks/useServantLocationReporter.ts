import { useEffect } from 'react';
import * as Location from 'expo-location';
import { postBookingTracking } from '@/lib/tracking';

/** Sends GPS to the server while enabled (every ~12s). */
export function useServantLocationReporter(bookingId: number | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || bookingId == null) return;

    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    const push = async (latitude: number, longitude: number) => {
      try {
        await postBookingTracking(bookingId, latitude, longitude);
      } catch {
        /* network blips — next tick retries */
      }
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await push(pos.coords.latitude, pos.coords.longitude);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 12,
          timeInterval: 12000,
        },
        (p) => push(p.coords.latitude, p.coords.longitude),
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [bookingId, enabled]);
}
