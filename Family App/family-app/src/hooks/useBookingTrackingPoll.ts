import { useQuery } from '@tanstack/react-query';
import { fetchBookingTracking } from '@/lib/tracking';

export function useBookingTrackingPoll(bookingId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['booking-tracking', bookingId],
    queryFn: () => fetchBookingTracking(bookingId!),
    enabled: enabled && bookingId != null,
    refetchInterval: enabled ? 5000 : false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
}
