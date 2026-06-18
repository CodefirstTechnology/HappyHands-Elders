export type EarningsBooking = {
  id: number;
  status: string;
  sessionDate?: string | null;
  sessionHours?: number | null;
  monthlyStartDate?: string | null;
  totalAmount?: number | null;
  updatedAt?: string;
};

const isToday = (value?: string | null) => {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
};

const isSameMonth = (value?: string | null, ref: Date = new Date()) => {
  if (!value) return false;
  const d = new Date(value);
  const r = ref instanceof Date && !Number.isNaN(ref.getTime()) ? ref : new Date();
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
};

export const getBookingEarningsDate = (booking: EarningsBooking & {
  monthlyStartDate?: string | null;
}) => {
  if (booking.sessionDate) return booking.sessionDate;
  if (booking.monthlyStartDate) return booking.monthlyStartDate;
  return booking.updatedAt ?? null;
};

export const isCompletedToday = (booking: EarningsBooking) => {
  if (booking.status !== 'COMPLETED') return false;
  return isToday(getBookingEarningsDate(booking)) || isToday(booking.updatedAt);
};

export const isCompletedThisMonth = (
  booking: EarningsBooking & { monthlyStartDate?: string | null },
  ref: Date = new Date(),
) => {
  if (booking.status !== 'COMPLETED') return false;
  const monthRef = ref instanceof Date && !Number.isNaN(ref.getTime()) ? ref : new Date();
  const earningsDate = getBookingEarningsDate(booking);
  return isSameMonth(earningsDate, monthRef) || isSameMonth(booking.updatedAt, monthRef);
};

export const bookingEarningAmount = (
  booking: EarningsBooking,
  hourlyRate = 0,
) => {
  if (booking.totalAmount != null && booking.totalAmount > 0) {
    return booking.totalAmount;
  }
  if (booking.sessionHours && hourlyRate > 0) {
    return Math.round(booking.sessionHours * hourlyRate * 100) / 100;
  }
  return 0;
};

export const computeTodayEarnings = (
  bookings: EarningsBooking[],
  hourlyRate = 0,
  timeToday?: { totalHours?: number; estimatedEarnings?: number },
) => {
  const completedToday = bookings.filter((b) => isCompletedToday(b));
  const fromBookings = completedToday.reduce(
    (sum, b) => sum + bookingEarningAmount(b, hourlyRate),
    0,
  );

  const fromTime = timeToday?.estimatedEarnings ?? 0;

  return {
    amount: Math.max(fromBookings, fromTime),
    completedCount: completedToday.length,
    hoursToday: timeToday?.totalHours ?? 0,
  };
};

export const getMonthLabel = (ref = new Date()) =>
  ref.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export const computeMonthlyEarnings = (
  bookings: (EarningsBooking & { monthlyStartDate?: string | null })[],
  hourlyRate = 0,
  ref = new Date(),
) => {
  const completedThisMonth = bookings.filter((b) => isCompletedThisMonth(b, ref));
  const amount = completedThisMonth.reduce(
    (sum, b) => sum + bookingEarningAmount(b, hourlyRate),
    0,
  );

  return {
    amount: Math.round(amount * 100) / 100,
    completedCount: completedThisMonth.length,
    monthLabel: getMonthLabel(ref),
  };
};
