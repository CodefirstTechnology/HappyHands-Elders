const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");

exports.listNotifications = async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  sendSuccess(res, { notifications });
};

exports.markRead = async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user.id }
  });
  if (!notification) throw new ApiError(404, "Notification not found");

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  sendSuccess(res, { notification: updated });
};

exports.markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true }
  });

  sendSuccess(res, { message: "All notifications marked as read" });
};
