import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  stopPendingRequestVibration,
  syncPendingRequestVibration,
} from '@/lib/bookingRequestVibration';

type BookingRow = { id: number; status: string };

/** Repeat vibration while open or direct pending booking requests need a response. */
export function usePendingRequestVibration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const evaluate = () => {
      const openRequests =
        qc.getQueryData<BookingRow[]>(['open-requests']) ?? [];
      const bookings = qc.getQueryData<BookingRow[]>(['bookings']) ?? [];
      const pendingDirect = bookings.filter((b) => b.status === 'PENDING').length;
      syncPendingRequestVibration(openRequests.length > 0 || pendingDirect > 0);
    };

    evaluate();
    const unsub = qc.getQueryCache().subscribe(evaluate);
    return () => {
      unsub();
      stopPendingRequestVibration();
    };
  }, [isAuthenticated, qc]);
}
