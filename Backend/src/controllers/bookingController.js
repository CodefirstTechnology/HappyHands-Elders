const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const {
  checkBookingConflict,
  parseJsonArray,
  expireStaleSessionBookings,
  isSessionPast,
  computeBookingEarnings,
  normalizeBookingRow
} = require("../services/bookingService");
const { createNotification } = require("../services/notificationService");
const {
  issueWorkStartOtp,
  verifyWorkStartOtp,
  attachWorkOtpFields,
  hasPendingWorkOtp
} = require("../services/workStartOtpService");
const {
  findCaregiversNearLocation,
  caregiverCoversLocation,
  bookingMatchesCaregiverSkill
} = require("../services/locationService");

const bookingInclude = {
  caregiver: {
    include: {
      user: { select: { id: true, name: true, phone: true } },
      skills: true
    }
  },
  familyClient: {
    include: { user: { select: { id: true, name: true, phone: true } } }
  },
  review: true,
  timeEntries: true
};

const loadBooking = (id) =>
  prisma.booking.findUnique({
    where: { id },
    include: {
      ...bookingInclude,
      caregiver: { include: { user: { select: { id: true } }, skills: true } },
      familyClient: { include: { user: { select: { id: true, name: true, phone: true } } } }
    }
  });

const normalizeWorkingDays = (workingDays) =>
  Array.isArray(workingDays) ? JSON.stringify(workingDays) : workingDays;

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
};

const normalizeSessionBooking = (body) => {
  const slots = Array.isArray(body.sessionSlots)
    ? body.sessionSlots.filter((slot) => slot?.start && slot?.end)
    : [];

  if (slots.length > 0) {
    const sorted = [...slots].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );
    return {
      sessionSlots: JSON.stringify(sorted),
      sessionStartTime: sorted[0].start,
      sessionEndTime: sorted[sorted.length - 1].end,
      sessionHours: sorted.length
    };
  }

  if (body.sessionStartTime && body.sessionEndTime) {
    const single = [{ start: body.sessionStartTime, end: body.sessionEndTime }];
    return {
      sessionSlots: JSON.stringify(single),
      sessionStartTime: body.sessionStartTime,
      sessionEndTime: body.sessionEndTime,
      sessionHours: body.sessionHours ?? 1
    };
  }

  return {
    sessionSlots: undefined,
    sessionStartTime: body.sessionStartTime,
    sessionEndTime: body.sessionEndTime,
    sessionHours: body.sessionHours
  };
};

exports.createBooking = async (req, res) => {
  const familyClient = await prisma.familyClient.findUnique({
    where: { userId: req.user.id }
  });
  if (!familyClient) throw new ApiError(403, "Family client profile required");

  const sessionFields = normalizeSessionBooking(req.body);
  const bookingData = {
    ...req.body,
    ...sessionFields,
    workingDays: normalizeWorkingDays(req.body.workingDays),
    monthlyStartDate: req.body.monthlyStartDate
      ? new Date(req.body.monthlyStartDate)
      : undefined,
    monthlyEndDate: req.body.monthlyEndDate
      ? new Date(req.body.monthlyEndDate)
      : undefined,
    sessionDate: req.body.sessionDate ? new Date(req.body.sessionDate) : undefined,
    requestedSkill: req.body.requestedSkill
      ? String(req.body.requestedSkill).toUpperCase()
      : undefined
  };

  const latitude = bookingData.latitude ?? familyClient.latitude ?? undefined;
  const longitude = bookingData.longitude ?? familyClient.longitude ?? undefined;
  const address = bookingData.address || familyClient.address;
  const flatNo = bookingData.flatNo ?? familyClient.flatNo ?? undefined;
  const building = bookingData.building ?? familyClient.building ?? undefined;
  const area = bookingData.area ?? familyClient.area ?? undefined;

  if (!req.body.caregiverId) {
    if (
      latitude == null ||
      longitude == null ||
      Number.isNaN(Number(latitude)) ||
      Number.isNaN(Number(longitude))
    ) {
      throw new ApiError(
        400,
        "Live location (latitude and longitude) is required for area requests"
      );
    }

    const booking = await prisma.booking.create({
      data: {
        familyClientId: familyClient.id,
        caregiverId: null,
        bookingType: bookingData.bookingType,
        requestedSkill: bookingData.requestedSkill,
        monthlyStartDate: bookingData.monthlyStartDate,
        monthlyEndDate: bookingData.monthlyEndDate,
        hoursPerDay: bookingData.hoursPerDay,
        workingDays: bookingData.workingDays,
        sessionDate: bookingData.sessionDate,
        sessionStartTime: bookingData.sessionStartTime,
        sessionEndTime: bookingData.sessionEndTime,
        sessionHours: bookingData.sessionHours,
        sessionSlots: bookingData.sessionSlots,
        address,
        flatNo,
        building,
        area,
        latitude,
        longitude,
        totalAmount: bookingData.totalAmount,
        notes: bookingData.notes,
        status: "PENDING"
      },
      include: bookingInclude
    });

    const nearbyCaregivers = await findCaregiversNearLocation(latitude, longitude, {
      skill: bookingData.requestedSkill
    });

    await Promise.all(
      nearbyCaregivers.map((caregiver) =>
        createNotification({
          userId: caregiver.user.id,
          title: "Job request in your area",
          body: "A family client nearby needs elder care — accept first to get the booking",
          type: "BOOKING_OPEN",
          data: { bookingId: booking.id }
        })
      )
    );

    return sendSuccess(
      res,
      {
        booking,
        broadcast: {
          notifiedCaregivers: nearbyCaregivers.length,
          caregiverNames: nearbyCaregivers.map((s) => s.user.name)
        }
      },
      201
    );
  }

  const caregiver = await prisma.caregiver.findUnique({
    where: { id: req.body.caregiverId },
    include: { zones: true }
  });
  if (!caregiver || caregiver.verificationStatus !== "VERIFIED") {
    throw new ApiError(400, "Caregiver not available for booking");
  }

  if (
    latitude != null &&
    longitude != null &&
    !caregiverCoversLocation(caregiver, latitude, longitude)
  ) {
    throw new ApiError(400, "This caregiver does not serve your area");
  }

  const booking = await prisma.$transaction(async (tx) => {
    await checkBookingConflict(caregiver.id, bookingData, undefined, familyClient.id);

    return tx.booking.create({
      data: {
        familyClientId: familyClient.id,
        caregiverId: caregiver.id,
        bookingType: bookingData.bookingType,
        requestedSkill: bookingData.requestedSkill,
        monthlyStartDate: bookingData.monthlyStartDate,
        monthlyEndDate: bookingData.monthlyEndDate,
        hoursPerDay: bookingData.hoursPerDay,
        workingDays: bookingData.workingDays,
        sessionDate: bookingData.sessionDate,
        sessionStartTime: bookingData.sessionStartTime,
        sessionEndTime: bookingData.sessionEndTime,
        sessionHours: bookingData.sessionHours,
        sessionSlots: bookingData.sessionSlots,
        address,
        flatNo,
        building,
        area,
        latitude,
        longitude,
        totalAmount: bookingData.totalAmount,
        notes: bookingData.notes,
        status: "PENDING"
      },
      include: bookingInclude
    });
  });

  const caregiverUser = await prisma.user.findUnique({
    where: { id: caregiver.userId }
  });

  if (caregiverUser) {
    await createNotification({
      userId: caregiverUser.id,
      title: "New booking request",
      body: "You have a new booking request",
      type: "BOOKING_CREATED",
      data: { bookingId: booking.id }
    });
  }

  sendSuccess(res, { booking }, 201);
};

exports.listBookings = async (req, res) => {
  const { status } = req.query;
  let where = {};

  if (req.user.role === "FAMILY_CLIENT" || req.user.role === "PARENT") {
    const fc = await prisma.familyClient.findUnique({ where: { userId: req.user.id } });
    if (!fc) throw new ApiError(403, "Family client profile required");
    where.familyClientId = fc.id;
  } else if (req.user.role === "CAREGIVER") {
    const s = await prisma.caregiver.findUnique({ where: { userId: req.user.id } });
    if (!s) throw new ApiError(403, "Caregiver profile required");
    where.caregiverId = s.id;
  } else {
    throw new ApiError(403, "Not allowed");
  }

  await expireStaleSessionBookings(where);

  if (status) where.status = status;

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { createdAt: "desc" }
  });

  const enriched = await attachWorkOtpFields(bookings, req.user.role);
  sendSuccess(res, { bookings: enriched.map(normalizeBookingRow) });
};

exports.listOpenRequests = async (req, res) => {
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: req.user.id },
    include: { skills: true, zones: true, user: { select: { name: true } } }
  });
  if (!caregiver) throw new ApiError(403, "Caregiver profile required");

  const openBookings = await prisma.booking.findMany({
    where: {
      caregiverId: null,
      status: "PENDING",
      latitude: { not: null },
      longitude: { not: null }
    },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const requests = openBookings.filter(
    (booking) =>
      caregiverCoversLocation(caregiver, booking.latitude, booking.longitude) &&
      bookingMatchesCaregiverSkill(booking, caregiver)
  );

  sendSuccess(res, { requests });
};

exports.getBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  await assertBookingAccess(req, booking);

  const [enriched] = await attachWorkOtpFields([booking], req.user.role);
  sendSuccess(res, { booking: normalizeBookingRow(enriched) });
};

const assertBookingAccess = async (req, booking) => {
  if (req.user.role === "FAMILY_CLIENT" || req.user.role === "PARENT") {
    if (booking.familyClient.userId !== req.user.id) {
      throw new ApiError(403, "Not your booking");
    }
  } else if (req.user.role === "CAREGIVER") {
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: req.user.id },
      include: { skills: true, zones: true }
    });
    if (!caregiver) throw new ApiError(403, "Caregiver profile required");

    const isAssigned = booking.caregiverId === caregiver.id;
    const isOpenNearby =
      booking.caregiverId == null &&
      booking.status === "PENDING" &&
      booking.latitude != null &&
      booking.longitude != null &&
      caregiverCoversLocation(caregiver, booking.latitude, booking.longitude) &&
      bookingMatchesCaregiverSkill(booking, caregiver);

    if (!isAssigned && !isOpenNearby) {
      throw new ApiError(403, "Not your booking");
    }
  } else if (!["ADMIN", "COORDINATOR"].includes(req.user.role)) {
    throw new ApiError(403, "Access denied");
  }
};

exports.confirmBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING") {
    throw new ApiError(400, "Booking is not pending");
  }

  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: req.user.id },
    include: { skills: true, zones: true, user: { select: { name: true } } }
  });
  if (!caregiver) throw new ApiError(403, "Caregiver profile required");

  if (booking.caregiverId == null) {
    if (
      booking.latitude == null ||
      booking.longitude == null ||
      !caregiverCoversLocation(caregiver, booking.latitude, booking.longitude)
    ) {
      throw new ApiError(403, "This request is outside your service area");
    }
    if (!bookingMatchesCaregiverSkill(booking, caregiver)) {
      throw new ApiError(403, "This request does not match your skills");
    }

    const conflictData = {
      bookingType: booking.bookingType,
      sessionDate: booking.sessionDate,
      sessionStartTime: booking.sessionStartTime,
      sessionEndTime: booking.sessionEndTime,
      monthlyStartDate: booking.monthlyStartDate,
      monthlyEndDate: booking.monthlyEndDate,
      workingDays: booking.workingDays,
      hoursPerDay: booking.hoursPerDay
    };
    await checkBookingConflict(caregiver.id, conflictData, booking.id);

    const claimed = await prisma.booking.updateMany({
      where: { id, caregiverId: null, status: "PENDING" },
      data: { caregiverId: caregiver.id, status: "CONFIRMED" }
    });

    if (claimed.count === 0) {
      throw new ApiError(
        409,
        "Another caregiver already accepted this request. Check open requests for more bookings."
      );
    }

    const updated = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude
    });

    const ownerUserId = (
      await prisma.familyClient.findUnique({
        where: { id: booking.familyClientId },
        select: { userId: true }
      })
    )?.userId;

    if (ownerUserId) {
      await createNotification({
        userId: ownerUserId,
        title: "Caregiver assigned",
        body: `${caregiver.user?.name || "A caregiver"} accepted your request`,
        type: "BOOKING_CONFIRMED",
        data: { bookingId: id }
      });
    }

    return sendSuccess(res, { booking: updated });
  }

  if (booking.caregiver.userId !== req.user.id) {
    throw new ApiError(403, "Only the assigned caregiver can confirm");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const conflictData = {
      bookingType: booking.bookingType,
      sessionDate: booking.sessionDate,
      sessionStartTime: booking.sessionStartTime,
      sessionEndTime: booking.sessionEndTime,
      monthlyStartDate: booking.monthlyStartDate,
      monthlyEndDate: booking.monthlyEndDate,
      workingDays: booking.workingDays,
      hoursPerDay: booking.hoursPerDay
    };
    await checkBookingConflict(booking.caregiverId, conflictData, booking.id);

    return tx.booking.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: bookingInclude
    });
  });

  const ownerUserId = (
    await prisma.familyClient.findUnique({
      where: { id: booking.familyClientId },
      select: { userId: true }
    })
  ).userId;

  await createNotification({
    userId: ownerUserId,
    title: "Booking confirmed",
    body: "Your booking has been confirmed",
    type: "BOOKING_CONFIRMED",
    data: { bookingId: id }
  });

  sendSuccess(res, { booking: updated });
};

exports.rejectBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING") {
    throw new ApiError(400, "Booking is not pending");
  }
  if (booking.caregiverId == null) {
    throw new ApiError(400, "Open area requests cannot be declined — ignore if unavailable");
  }
  if (booking.caregiver.userId !== req.user.id) {
    throw new ApiError(403, "Only the assigned caregiver can reject");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "REJECTED", notes: req.body.reason || booking.notes },
    include: bookingInclude
  });

  const ownerUserId = (
    await prisma.familyClient.findUnique({
      where: { id: booking.familyClientId },
      select: { userId: true }
    })
  )?.userId;

  if (ownerUserId) {
    await createNotification({
      userId: ownerUserId,
      title: "Booking declined",
      body: req.body.reason || "The caregiver is unavailable for this booking",
      type: "BOOKING_REJECTED",
      data: { bookingId: id }
    });
  }

  sendSuccess(res, { booking: updated });
};

exports.cancelBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { familyClient: true }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.familyClient.userId !== req.user.id) {
    throw new ApiError(403, "Only the family client can cancel");
  }
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new ApiError(400, "Cannot cancel booking in current status");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: bookingInclude
  });

  sendSuccess(res, { booking: updated });
};

exports.completeBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");

  const isOwner = booking.familyClient.userId === req.user.id;
  const isCaregiver = booking.caregiver.userId === req.user.id;
  if (!isOwner && !isCaregiver) throw new ApiError(403, "Access denied");

  if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    throw new ApiError(400, "Booking cannot be completed");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "COMPLETED" },
    include: bookingInclude
  });

  await createNotification({
    userId: booking.familyClient.userId,
    title: "Booking completed",
    body: "Your booking has been marked completed",
    type: "BOOKING_COMPLETED",
    data: { bookingId: id }
  });

  sendSuccess(res, { booking: updated });
};

exports.createReview = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rating, comment, elderSafetyRating } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { familyClient: true, caregiver: true, review: true }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.familyClient.userId !== req.user.id) {
    throw new ApiError(403, "Only family client can review");
  }
  if (booking.status !== "COMPLETED") {
    throw new ApiError(400, "Can only review completed bookings");
  }
  if (booking.review) throw new ApiError(400, "Review already exists");

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: { bookingId: id, rating, comment, elderSafetyRating: elderSafetyRating ?? null }
    });

    const caregiver = booking.caregiver;
    const newTotal = caregiver.totalRatings + 1;
    const newRating =
      (caregiver.rating * caregiver.totalRatings + rating) / newTotal;

    await tx.caregiver.update({
      where: { id: caregiver.id },
      data: { rating: newRating, totalRatings: newTotal }
    });

    return r;
  });

  sendSuccess(res, { review }, 201);
};

const trackingPayload = (booking) => ({
  status: booking.status,
  home: {
    address: booking.address,
    latitude: booking.latitude,
    longitude: booking.longitude
  },
  caregiver:
    booking.caregiverLatitude != null && booking.caregiverLongitude != null
      ? {
          latitude: booking.caregiverLatitude,
          longitude: booking.caregiverLongitude,
          updatedAt: booking.caregiverLocationAt
        }
      : null
});

exports.getBookingTracking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      caregiver: { include: { user: { select: { id: true, name: true } } } },
      familyClient: { include: { user: { select: { id: true } } } }
    }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  await assertBookingAccess(req, booking);

  sendSuccess(res, trackingPayload(booking));
};

exports.updateBookingTracking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { latitude, longitude } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      caregiver: { include: { user: { select: { id: true, name: true } } } },
      familyClient: { include: { user: { select: { id: true } } } }
    }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.caregiver.userId !== req.user.id) {
    throw new ApiError(403, "Only the assigned caregiver can share location");
  }
  if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    throw new ApiError(400, "Location sharing is only available for confirmed or active bookings");
  }

  const firstShare = booking.caregiverLatitude == null || booking.caregiverLongitude == null;

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      caregiverLatitude: latitude,
      caregiverLongitude: longitude,
      caregiverLocationAt: new Date()
    }
  });

  if (firstShare && booking.familyClient?.user?.id) {
    await createNotification({
      userId: booking.familyClient.user.id,
      title: "Caregiver is on the way",
      body: `${booking.caregiver?.user?.name || "Your caregiver"} started sharing live location — open your booking to track on the map`,
      type: "HELPER_ON_WAY",
      data: { bookingId: id }
    });
  }

  sendSuccess(res, trackingPayload(updated));
};

const getCaregiverForUser = async (userId) => {
  const caregiver = await prisma.caregiver.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true } } }
  });
  if (!caregiver) throw new ApiError(403, "Caregiver profile required");
  return caregiver;
};

exports.markArrived = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "CONFIRMED") {
    throw new ApiError(400, "Booking must be confirmed before starting work");
  }

  const caregiver = await getCaregiverForUser(req.user.id);
  if (booking.caregiverId !== caregiver.id) {
    throw new ApiError(403, "Not your booking");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { caregiverId: caregiver.id, clockOut: null }
  });
  if (openEntry) {
    throw new ApiError(400, "Already working on a job. Finish it first.");
  }

  const { expiresAt } = await issueWorkStartOtp({
    booking,
    caregiverUser: caregiver.user,
    ownerUserId: booking.familyClient.userId
  });

  const refreshed = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });
  const [enriched] = await attachWorkOtpFields([refreshed], "CAREGIVER");

  sendSuccess(res, {
    booking: enriched,
    message: "Care-start OTP sent to family client. Ask them for the 4-digit code.",
    otpExpiresAt: expiresAt.toISOString()
  });
};

exports.resendWorkOtp = async (req, res) => {
  return exports.markArrived(req, res);
};

exports.verifyWorkOtp = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { otp } = req.body;

  const booking = await loadBooking(id);
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "CONFIRMED") {
    throw new ApiError(400, "Work OTP is only needed for confirmed bookings");
  }

  const caregiver = await getCaregiverForUser(req.user.id);
  if (booking.caregiverId !== caregiver.id) {
    throw new ApiError(403, "Not your booking");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { caregiverId: caregiver.id, clockOut: null }
  });
  if (openEntry) {
    throw new ApiError(400, "Already clocked in");
  }

  const pending = await hasPendingWorkOtp(id);
  if (!pending) {
    throw new ApiError(400, "No active OTP. Tap I arrived to request a new code.");
  }

  await verifyWorkStartOtp({ bookingId: id, otpInput: otp });

  const now = new Date();
  const entry = await prisma.$transaction(async (tx) => {
    const e = await tx.timeEntry.create({
      data: {
        bookingId: id,
        caregiverId: caregiver.id,
        clockIn: now,
        date: now
      }
    });

    await tx.booking.update({
      where: { id },
      data: { status: "ACTIVE", workStartedAt: now }
    });

    return e;
  });

  if (booking.familyClient?.userId) {
    await createNotification({
      userId: booking.familyClient.userId,
      title: "Caregiver has arrived",
      body: `${caregiver.user?.name || "Your caregiver"} started work at your location`,
      type: "BOOKING_ACTIVE",
      data: { bookingId: id }
    });
  }

  const refreshed = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });
  const [enriched] = await attachWorkOtpFields([refreshed], "CAREGIVER");

  sendSuccess(res, { booking: enriched, entry, message: "OTP verified. Work started." });
};
