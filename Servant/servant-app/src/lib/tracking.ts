import api from '@/lib/api';

export type BookingTracking = {
  status: string;
  home: {
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  servant: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  } | null;
};

export async function fetchBookingTracking(bookingId: number): Promise<BookingTracking> {
  const res = await api.get(`/bookings/${bookingId}/tracking`);
  return res.data.data as BookingTracking;
}

export async function postBookingTracking(
  bookingId: number,
  latitude: number,
  longitude: number,
): Promise<BookingTracking> {
  const res = await api.post(`/bookings/${bookingId}/tracking`, { latitude, longitude });
  return res.data.data as BookingTracking;
}
