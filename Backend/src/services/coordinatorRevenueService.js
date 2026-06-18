const prisma = require("../config/prisma");

const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

const getYearBounds = (year = new Date().getFullYear()) => ({
  year,
  start: new Date(year, 0, 1, 0, 0, 0, 0),
  end: new Date(year, 11, 31, 23, 59, 59, 999)
});

const completedBookingsForCoordinatorYear = (coordinatorId, { start, end }) => ({
  status: "COMPLETED",
  updatedAt: { gte: start, lte: end },
  caregiver: { coordinatorId }
});

const sumAmount = (bookings) =>
  roundMoney(bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0));

const buildMonthlySeries = (bookings, year) => {
  const months = [];
  for (let m = 0; m < 12; m += 1) {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
    const inMonth = bookings.filter((b) => {
      const d = new Date(b.updatedAt);
      return d >= monthStart && d <= monthEnd;
    });
    months.push({
      month: monthStart.toLocaleString("en", { month: "short" }),
      count: inMonth.length,
      revenue: sumAmount(inMonth)
    });
  }
  return months;
};

const buildCaregiverBreakdown = (bookings) => {
  const byCaregiver = new Map();
  for (const booking of bookings) {
    if (!booking.caregiver) continue;
    const key = booking.caregiverId;
    const existing = byCaregiver.get(key) || {
      caregiverId: key,
      name: booking.caregiver.user?.name || "Caregiver",
      completedBookings: 0,
      revenue: 0
    };
    existing.completedBookings += 1;
    existing.revenue = roundMoney(existing.revenue + (booking.totalAmount || 0));
    byCaregiver.set(key, existing);
  }
  return [...byCaregiver.values()].sort((a, b) => b.revenue - a.revenue);
};

const getCoordinatorAnnualRevenue = async (coordinatorId, year = new Date().getFullYear()) => {
  const bounds = getYearBounds(year);
  const where = completedBookingsForCoordinatorYear(coordinatorId, bounds);

  const [bookings, caregiverCounts] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        totalAmount: true,
        updatedAt: true,
        caregiverId: true,
        caregiver: {
          select: {
            id: true,
            user: { select: { name: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.caregiver.groupBy({
      by: ["verificationStatus"],
      where: { coordinatorId },
      _count: true
    })
  ]);

  const totalCaregivers = caregiverCounts.reduce((n, row) => n + row._count, 0);
  const verifiedCaregivers =
    caregiverCounts.find((row) => row.verificationStatus === "VERIFIED")?._count || 0;

  return {
    year: bounds.year,
    annualRevenue: sumAmount(bookings),
    annualCompletedBookings: bookings.length,
    totalCaregivers,
    verifiedCaregivers,
    revenueByMonth: buildMonthlySeries(bookings, bounds.year),
    caregiverRevenue: buildCaregiverBreakdown(bookings)
  };
};

const attachAnnualRevenueToCoordinators = async (coordinators, year = new Date().getFullYear()) => {
  if (!coordinators.length) return coordinators;

  const bounds = getYearBounds(year);
  const coordinatorIds = coordinators.map((a) => a.id);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      updatedAt: { gte: bounds.start, lte: bounds.end },
      caregiver: { coordinatorId: { in: coordinatorIds } }
    },
    select: {
      totalAmount: true,
      caregiver: { select: { coordinatorId: true } }
    }
  });

  const revenueByCoordinator = new Map(coordinatorIds.map((id) => [id, 0]));
  const bookingsByCoordinator = new Map(coordinatorIds.map((id) => [id, 0]));

  for (const booking of bookings) {
    const coordinatorId = booking.caregiver?.coordinatorId;
    if (!coordinatorId) continue;
    revenueByCoordinator.set(
      coordinatorId,
      roundMoney((revenueByCoordinator.get(coordinatorId) || 0) + (booking.totalAmount || 0))
    );
    bookingsByCoordinator.set(coordinatorId, (bookingsByCoordinator.get(coordinatorId) || 0) + 1);
  }

  return coordinators.map((coordinator) => ({
    ...coordinator,
    annualRevenue: revenueByCoordinator.get(coordinator.id) || 0,
    annualCompletedBookings: bookingsByCoordinator.get(coordinator.id) || 0,
    revenueYear: bounds.year
  }));
};

module.exports = {
  getYearBounds,
  getCoordinatorAnnualRevenue,
  attachAnnualRevenueToCoordinators
};
