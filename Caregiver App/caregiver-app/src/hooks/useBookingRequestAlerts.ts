import { useEffect, useRef } from 'react';
import {
  alertBookingRequest,
  BOOKING_REQUEST_TYPES,
  initNotificationAlerts,
} from '@/lib/notificationAlerts';
import { useNotifications } from '@/hooks/useNotifications';

/** Vibrate and play alert when a new home-owner booking request notification arrives. */
export function useBookingRequestAlerts() {
  const { data: notifications = [] } = useNotifications();
  const seenIds = useRef<Set<number>>(new Set());
  const bootstrapped = useRef(false);

  useEffect(() => {
    initNotificationAlerts();
  }, []);

  useEffect(() => {
    const bookingNotes = notifications.filter((n) => BOOKING_REQUEST_TYPES.has(n.type));

    if (!bootstrapped.current) {
      bookingNotes.forEach((n) => seenIds.current.add(n.id));
      bootstrapped.current = true;
      return;
    }

    const fresh = bookingNotes.filter((n) => !seenIds.current.has(n.id));
    fresh.forEach((n) => {
      seenIds.current.add(n.id);
      void alertBookingRequest(n);
    });
  }, [notifications]);
}
