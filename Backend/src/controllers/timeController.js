const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { createNotification } = require("../services/notificationService");
const { hasPendingWorkOtp } = require("../services/workStartOtpService");
const { computeBookingEarnings, isSessionPast, expireStaleSessionBookings } = require("../services/bookingService");

const getMonthBounds = (ref = new Date()) => {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const getBookingEarningsDate = (booking) =>
  booking.sessionDate || booking.monthlyStartDate || booking.updatedAt;

const isInMonth = (value, start, end) => {
  if (!value) return false;
  const d = new Date(value);
  return d >= start && d <= end;
};

const getCaregiver = async (userId) => {
  const caregiver = await prisma.caregiver.findUnique({ where: { userId } });
  if (!caregiver) throw new ApiError(404, "Caregiver profile not found");
  return caregiver;
};

exports.clockIn = async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) throw new ApiError(400, "bookingId is required");

  const caregiver = await getCaregiver(req.user.id);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }
  });

  if (!booking || booking.caregiverId !== caregiver.id) {
    throw new ApiError(404, "Booking not found");
  }
  if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    throw new ApiError(400, "Booking must be confirmed or active to clock in");
  }

  if (booking.status === "CONFIRMED") {
    const pending = await hasPendingWorkOtp(bookingId);
    if (pending) {
      throw new ApiError(400, "Enter the 4-digit care-start OTP from the parent to start work");
    }
    throw new ApiError(400, "Tap I arrived to get a care-start OTP from the parent first");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { caregiverId: caregiver.id, clockOut: null }
  });
  if (openEntry) {
    throw new ApiError(400, "Already clocked in. Clock out first.");
  }

  const now = new Date();
  const entry = await prisma.$transaction(async (tx) => {
    const e = await tx.timeEntry.create({
      data: {
        bookingId,
        caregiverId: caregiver.id,
        clockIn: now,
        date: now
      }
    });

    if (booking.status === "CONFIRMED") {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "ACTIVE" }
      });
    }

    return e;
  });

  const owner = await prisma.parent.findUnique({
    where: { id: booking.parentId },
    select: { userId: true }
  });
  if (owner?.userId) {
    await createNotification({
      userId: owner.userId,
      title: "Caregiver has arrived",
      body: "Your caregiver started work at your location",
      type: "BOOKING_ACTIVE",
      data: { bookingId }
    });
  }

  sendSuccess(res, { entry }, 201);
};

exports.clockOut = async (req, res) => {
  const caregiver = await getCaregiver(req.user.id);

  const openEntry = await prisma.timeEntry.findFirst({
    where: { caregiverId: caregiver.id, clockOut: null },
    orderBy: { clockIn: "desc" }
  });

  if (!openEntry) throw new ApiError(400, "No active clock-in session");

  const now = new Date();
  const hoursWorked =
    (now.getTime() - new Date(openEntry.clockIn).getTime()) / (1000 * 60 * 60);

  const entry = await prisma.timeEntry.update({
    where: { id: openEntry.id },
    data: { clockOut: now, hoursWorked: Math.round(hoursWorked * 100) / 100 }
  });

  const booking = await prisma.booking.findUnique({
    where: { id: openEntry.bookingId },
    include: { timeEntries: true, caregiver: { select: { hourlyRate: true } } }
  });

  if (booking && ["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    const totalAmount = computeBookingEarnings(
      { ...booking, timeEntries: booking.timeEntries },
      booking.caregiver?.hourlyRate
    );
    const sessionEnded = booking.bookingType === "SESSION" && isSessionPast(booking, now);

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        ...(totalAmount > 0 ? { totalAmount } : {}),
        ...(sessionEnded ? { status: "COMPLETED" } : {})
      }
    });
  }

  sendSuccess(res, { entry });
};

exports.getToday = async (req, res) => {
  const caregiver = await getCaregiver(req.user.id);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const entries = await prisma.timeEntry.findMany({
    where: {
      caregiverId: caregiver.id,
      date: { gte: start, lte: end }
    },
    include: { booking: { select: { id: true, address: true, bookingType: true } } },
    orderBy: { clockIn: "desc" }
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);

  const caregiverProfile = await prisma.caregiver.findUnique({
    where: { id: caregiver.id },
    select: { hourlyRate: true }
  });
  const hourlyRate = caregiverProfile?.hourlyRate || 0;
  const estimatedEarnings = Math.round(totalHours * hourlyRate * 100) / 100;

  sendSuccess(res, { entries, totalHours, hourlyRate, estimatedEarnings });
};

exports.getMonth = async (req, res) => {
  const caregiver = await getCaregiver(req.user.id);
  const now = new Date();
  const { start, end } = getMonthBounds(now);

  await expireStaleSessionBookings({ caregiverId: caregiver.id });

  const completed = await prisma.booking.findMany({
    where: {
      caregiverId: caregiver.id,
      status: "COMPLETED"
    },
    include: { timeEntries: true }
  });

  const hourlyRate = caregiver.hourlyRate || 0;
  const inMonth = completed.filter((booking) => {
    const earningsDate = getBookingEarningsDate(booking);
    return isInMonth(earningsDate, start, end) || isInMonth(booking.updatedAt, start, end);
  });

  const totalEarnings = inMonth.reduce(
    (sum, booking) => sum + computeBookingEarnings(booking, hourlyRate),
    0
  );

  sendSuccess(res, {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    completedCount: inMonth.length,
    hourlyRate,
    monthLabel: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  });
};

exports.getHistory = async (req, res) => {
  const caregiver = await getCaregiver(req.user.id);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { caregiverId: caregiver.id },
      include: { booking: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.timeEntry.count({ where: { caregiverId: caregiver.id } })
  ]);

  sendSuccess(res, { entries, pagination: { page, limit, total } });
};
