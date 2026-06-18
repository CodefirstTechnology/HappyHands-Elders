const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { createNotification } = require("./notificationService");
const {
  findCoordinatorsNearLocation,
  isCaregiverNearCoordinator,
  coordinatorHasLocation
} = require("./locationService");

const notifyNearbyCoordinatorsOfRegistration = async (caregiver, { name, city, address }) => {
  if (caregiver.latitude == null || caregiver.longitude == null) return [];

  const nearbyCoordinators = await findCoordinatorsNearLocation(
    caregiver.latitude,
    caregiver.longitude
  );

  const areaLabel = city || address || "your area";

  await Promise.all(
    nearbyCoordinators.map((coordinator) =>
      createNotification({
        userId: coordinator.userId,
        title: "New caregiver registration nearby",
        body: `${name} applied from ${areaLabel}. Review in App registrations.`,
        type: "CAREGIVER_REGISTRATION_NEARBY",
        data: { caregiverId: caregiver.id, coordinatorId: coordinator.id }
      })
    )
  );

  return nearbyCoordinators;
};

const assertCoordinatorCanAccessCaregiver = (scope, caregiver, coordinator) => {
  if (scope.isAdmin) return;

  if (caregiver.coordinatorId === scope.coordinatorId) return;

  const isOpenRegistration =
    caregiver.registrationSource === "SELF" && caregiver.coordinatorId == null;

  if (!isOpenRegistration) {
    throw new ApiError(404, "Caregiver not found");
  }

  if (!coordinatorHasLocation(coordinator)) {
    throw new ApiError(
      400,
      "Set your agency location in Profile to review nearby registrations"
    );
  }

  if (!isCaregiverNearCoordinator(caregiver, coordinator)) {
    throw new ApiError(404, "Caregiver not found");
  }
};

module.exports = {
  notifyNearbyCoordinatorsOfRegistration,
  assertCoordinatorCanAccessCaregiver
};
