const prisma = require("../config/prisma");
const logger = require("../utils/logger");

const createNotification = async ({ userId, title, body, type, data }) => {
  try {
    return await prisma.notification.create({
      data: { userId, title, body, type, data: data || undefined }
    });
  } catch (err) {
    logger.error("Failed to create notification", { err: err.message, userId, type });
    return null;
  }
};

module.exports = { createNotification };
