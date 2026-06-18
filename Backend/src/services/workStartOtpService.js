const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { createNotification } = require("./notificationService");
const { sendCareStartOtpSms } = require("./smsService");

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const hashOtp = (otp, bookingId) =>
  crypto
    .createHash("sha256")
    .update(`${otp}:${bookingId}:${process.env.JWT_SECRET || "childcare"}`)
    .digest("hex");

const generateOtpCode = () => String(Math.floor(1000 + Math.random() * 9000));

const getActiveOtp = async (bookingId) =>
  prisma.bookingWorkStartOtp.findFirst({
    where: {
      bookingId,
      verifiedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

const issueWorkStartOtp = async ({ booking, caregiverUser, ownerUserId }) => {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const caregiverName = caregiverUser?.name || "your caregiver";

  await prisma.$transaction(async (tx) => {
    await tx.bookingWorkStartOtp.updateMany({
      where: { bookingId: booking.id, verifiedAt: null },
      data: { verifiedAt: new Date() }
    });

    const now = new Date();
    await tx.bookingWorkStartOtp.create({
      data: {
        bookingId: booking.id,
        code,
        otpHash: hashOtp(code, booking.id),
        expiresAt,
        sentAt: now,
        used: false
      }
    });
  });

  if (ownerUserId) {
    await createNotification({
      userId: ownerUserId,
      title: "Care-start OTP",
      body: `Share care-start OTP ${code} with ${caregiverName} to begin care`,
      type: "WORK_START_OTP",
      data: {
        bookingId: booking.id,
        otp: code,
        expiresAt: expiresAt.toISOString(),
        caregiverName
      }
    });

    const owner = await prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { phone: true }
    });
    if (owner?.phone) {
      await sendCareStartOtpSms({
        phone: owner.phone,
        otp: code,
        caregiverName,
        bookingId: booking.id
      });
    }
  }

  return { code, expiresAt };
};

const verifyWorkStartOtp = async ({ bookingId, otpInput }) => {
  const otp = String(otpInput || "").trim();
  if (!/^\d{4}$/.test(otp)) {
    throw new ApiError(400, "Enter the 4-digit care-start OTP from the parent");
  }

  const record = await getActiveOtp(bookingId);
  if (!record) {
    throw new ApiError(400, "Care-start OTP expired or not requested. Tap arrived to get a new OTP.");
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many wrong attempts. Request a new care-start OTP.");
  }

  const valid = hashOtp(otp, bookingId) === record.otpHash;
  if (!valid) {
    await prisma.bookingWorkStartOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } }
    });
    const left = MAX_ATTEMPTS - record.attempts - 1;
    throw new ApiError(
      400,
      left > 0 ? `Incorrect care-start OTP. ${left} attempt(s) left.` : "Incorrect care-start OTP. Request a new code."
    );
  }

  const now = new Date();
  await prisma.bookingWorkStartOtp.update({
    where: { id: record.id },
    data: { verifiedAt: now }
  });

  return { verifiedAt: now };
};

const attachWorkOtpFields = async (bookings, role) => {
  if (!Array.isArray(bookings) || bookings.length === 0) return bookings;

  const ids = bookings.filter((b) => b.status === "CONFIRMED").map((b) => b.id);
  if (ids.length === 0) {
    return bookings.map((b) => ({ ...b, pendingWorkOtp: false }));
  }

  let activeOtps = [];
  try {
    activeOtps = await prisma.bookingWorkStartOtp.findMany({
      where: {
        bookingId: { in: ids },
        verifiedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch {
    return bookings.map((b) => ({ ...b, pendingWorkOtp: false }));
  }

  const otpByBooking = new Map();
  for (const row of activeOtps) {
    if (!otpByBooking.has(row.bookingId)) otpByBooking.set(row.bookingId, row);
  }

  return bookings.map((booking) => {
    const row = otpByBooking.get(booking.id);
    if (!row) return { ...booking, pendingWorkOtp: false };

    if (role === "PARENT") {
      return {
        ...booking,
        pendingWorkOtp: true,
        workStartOtp: {
          code: row.code,
          expiresAt: row.expiresAt.toISOString()
        }
      };
    }

    return {
      ...booking,
      pendingWorkOtp: true,
      workOtpExpiresAt: row.expiresAt.toISOString()
    };
  });
};

const hasPendingWorkOtp = async (bookingId) => {
  try {
    const row = await getActiveOtp(bookingId);
    return !!row;
  } catch {
    return false;
  }
};

module.exports = {
  OTP_TTL_MS,
  MAX_ATTEMPTS,
  issueWorkStartOtp,
  verifyWorkStartOtp,
  attachWorkOtpFields,
  getActiveOtp,
  hasPendingWorkOtp
};
